"""
Lumina Repo Indexer v3 — multi-app support
-------------------------------------------
Each indexed application gets its own Qdrant collection
keyed by a stable app_id (slug of the repo name).

App registry is persisted to /tmp/lumina_apps.json so it
survives agent restarts within the same Docker session.

Endpoints:
  GET  /health
  GET  /status
  GET  /apps                   list all indexed apps
  GET  /apps/{app_id}          single app details
  DELETE /apps/{app_id}        remove from registry
  POST /reindex                index a repo (background)
  POST /apps/{app_id}/activate switch active app
  POST /reset                  reset job state
"""
import os, subprocess, hashlib, json, datetime, shutil
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

QDRANT_URL  = os.environ.get("QDRANT_URL",  "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
NEO4J_URI   = os.environ.get("NEO4J_URI",   "bolt://neo4j:7687")
NEO4J_USER  = os.environ.get("NEO4J_USER",  "neo4j")
NEO4J_PASS  = os.environ.get("NEO4J_PASSWORD", "lumina2024")
OPENAI_KEY  = os.environ.get("OPENAI_API_KEY", "")
REPO_DIR    = Path("/tmp/indexed-repo")
REGISTRY    = Path("/tmp/lumina_apps.json")
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM   = 1536
CHUNK_CHARS = 800
OVERLAP     = 150
INCLUDE_EXT = {".ts",".tsx",".js",".mjs",".json",".md",".css",".sql",".py",".yaml",".yml",".txt",".jsx",".java",".xml",".gradle",".properties",".jsp",".cs",".go",".rs",".c",".cpp",".h",".hpp",".sh",".tf",".tfvars",".hcl"}
EXCLUDE_DIR = {".git","node_modules",".next","dist","build",".turbo","__pycache__","coverage"}

app = FastAPI(title="Lumina Repo Indexer", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

job = {
    "status":"idle","progress":0,"message":"Ready.",
    "app_id":"","repo_url":"","repo_name":"",
    "files":0,"chunks":0,"started_at":None,"finished_at":None,"error":None,
}

def load_registry() -> dict:
    if REGISTRY.exists():
        try: return json.loads(REGISTRY.read_text())
        except: pass
    return {}

def save_registry(reg: dict):
    REGISTRY.write_text(json.dumps(reg, indent=2))

def make_app_id(repo_url: str) -> str:
    name = repo_url.rstrip("/").split("/")[-1]
    slug = "".join(c if c.isalnum() else "_" for c in name).lower()
    return slug[:40]

def coll_name(app_id: str) -> str:
    return f"app_{app_id}_codebase"

def set_job(status=None, progress=None, message=None, **kw):
    if status:  job["status"]   = status
    if progress is not None: job["progress"] = progress
    if message: job["message"]  = message
    for k,v in kw.items(): job[k] = v
    print(f"[indexer] [{job['progress']}%] {job['message']}")

def _clone_via_git(url: str):
    """Original approach — requires the `git` binary on PATH. Works locally
    and on any container/VM that has git installed."""
    subprocess.run(["git", "clone", "--depth=1", url, str(REPO_DIR)], check=True, capture_output=True)

def _clone_via_tarball(repo_url: str, git_token: str):
    """Docker-free / git-free fallback used automatically when the `git`
    binary isn't available (e.g. a Cloud Run buildpack image built purely
    from requirements.txt). Downloads the repo as a zip/tarball instead of
    shelling out to git."""
    import requests, tarfile, zipfile, io as _io, urllib.parse
    
    clean_url = repo_url.strip()
    parsed = urllib.parse.urlparse(clean_url)
    host = parsed.netloc.split("@")[-1].lower()
    parts = [p for p in parsed.path.rstrip("/").replace(".git", "").split("/") if p]
    
    headers = {"User-Agent": "Lumina-Platform"}
    auth = None
    is_zip = False
    provider = "github"
    
    if "dev.azure.com" in host:
        provider = "azure"
        is_zip = True
        org = parts[0]
        proj = parts[1]
        repo = parts[3] if len(parts) > 3 and parts[2] == "_git" else parts[2]
        if git_token:
            auth = ("PAT", git_token)
        urls_to_try = [
            f"https://dev.azure.com/{org}/{proj}/_apis/git/repositories/{repo}/items?api-version=6.0&download=true&scopePath=/&recursionLevel=Full&$format=zip"
        ]
    elif "gitlab.com" in host:
        provider = "gitlab"
        owner_repo = "/".join(parts)
        owner_repo_encoded = urllib.parse.quote_plus(owner_repo)
        if git_token:
            headers["PRIVATE-TOKEN"] = git_token
        urls_to_try = [
            f"https://gitlab.com/api/v4/projects/{owner_repo_encoded}/repository/archive.tar.gz?sha=main",
            f"https://gitlab.com/api/v4/projects/{owner_repo_encoded}/repository/archive.tar.gz?sha=master"
        ]
    elif "bitbucket.org" in host:
        provider = "bitbucket"
        owner_repo = "/".join(parts)
        if git_token:
            auth = ("x-token-auth", git_token)
        urls_to_try = [
            f"https://bitbucket.org/{owner_repo}/get/main.tar.gz",
            f"https://bitbucket.org/{owner_repo}/get/master.tar.gz"
        ]
    else:
        provider = "github"
        owner_repo = "/".join(parts)
        if git_token:
            headers["Authorization"] = f"token {git_token}"
        urls_to_try = [
            f"https://api.github.com/repos/{owner_repo}/tarball/main",
            f"https://api.github.com/repos/{owner_repo}/tarball/master"
        ]
        
    last_err = None
    for download_url in urls_to_try:
        try:
            resp = requests.get(download_url, headers=headers, auth=auth, timeout=90)
            if resp.status_code != 200:
                last_err = f"HTTP {resp.status_code} for URL {download_url}"
                continue
                
            if is_zip:
                with zipfile.ZipFile(_io.BytesIO(resp.content)) as zf:
                    zf.extractall(REPO_DIR.parent)
                    top = zf.namelist()[0].split("/")[0]
            else:
                with tarfile.open(fileobj=_io.BytesIO(resp.content), mode="r:gz") as tf:
                    tf.extractall(REPO_DIR.parent)
                    top = tf.getnames()[0].split("/")[0]
                    
            extracted = REPO_DIR.parent / top
            if REPO_DIR.exists():
                shutil.rmtree(REPO_DIR)
            extracted.rename(REPO_DIR)
            return
        except Exception as e:
            last_err = str(e)
            
    raise RuntimeError(f"Archive download failed for {repo_url} (detected provider: {provider}): {last_err}")

def clone_repo(repo_url, git_token):
    if REPO_DIR.exists(): shutil.rmtree(REPO_DIR)
    url = repo_url.strip()
    if git_token: url = url.replace("https://", f"https://{git_token}@")
    set_job(progress=5, message=f"Cloning {repo_url.split('/')[-1]}...")
    if shutil.which("git"):
        subprocess.run(["git", "clone", "--depth=1", url, str(REPO_DIR)], check=True, capture_output=True)
    else:
        # No git binary in this runtime (typical for a Cloud Run buildpack
        # image built only from requirements.txt) — fall back to a plain
        # HTTPS tarball download so the platform still runs with zero
        # container/OS-level setup.
        _clone_via_tarball(repo_url, git_token)
    set_job(progress=15, message="Clone complete.")

def iter_files():
    for p in REPO_DIR.rglob("*"):
        if p.is_file():
            # Include tf, dockerfiles, yaml configurations, etc.
            if p.suffix in INCLUDE_EXT or p.name == "Dockerfile" or p.suffix.lower() == ".dockerfile":
                if not any(e in p.parts for e in EXCLUDE_DIR):
                    yield p

def chunk_text(text, file_path):
    chunks, start, idx = [], 0, 0
    while start < len(text):
        cid = hashlib.md5(f"{file_path}:{idx}".encode()).hexdigest()
        chunks.append({"id":cid,"text":text[start:start+CHUNK_CHARS],"file":file_path,"chunk_index":idx})
        start += CHUNK_CHARS - OVERLAP
        idx   += 1
    return chunks

def embed_and_index(openai_key, app_id):
    from openai import OpenAI
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    oai    = OpenAI(api_key=openai_key or OPENAI_KEY)
    qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
    app_coll = coll_name(app_id)
    # Reset both the app-specific and the shared active collection
    for c in [app_coll, "lumina_codebase"]:
        try: qdrant.delete_collection(c)
        except: pass
        qdrant.create_collection(c, vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE))
    set_job(progress=20, message="Collections ready. Scanning files...")
    all_chunks, files_seen = [], 0
    for fpath in iter_files():
        try:
            text = fpath.read_text(encoding="utf-8", errors="ignore")
            rel  = str(fpath.relative_to(REPO_DIR))
            all_chunks.extend(chunk_text(text, rel))
            files_seen += 1
        except: pass
    set_job(progress=30, message=f"{files_seen} files → {len(all_chunks)} chunks. Embedding...")
    job["files"] = files_seen
    EBATCH, UBATCH, points = 20, 50, []
    for i in range(0, len(all_chunks), EBATCH):
        batch   = all_chunks[i:i+EBATCH]
        vectors = oai.embeddings.create(model=EMBED_MODEL, input=[c["text"] for c in batch]).data
        for chunk, emb in zip(batch, vectors):
            pid = abs(int(chunk["id"][:8],16))
            points.append(PointStruct(id=pid, vector=emb.embedding,
                payload={"file":chunk["file"],"chunk_index":chunk["chunk_index"],
                         "text":chunk["text"][:200],"app_id":app_id}))
        pct = 30 + int(55*(i+EBATCH)/max(len(all_chunks),1))
        set_job(progress=min(pct,84), message=f"Embedded {min(i+EBATCH,len(all_chunks))}/{len(all_chunks)} chunks...")
    for i in range(0, len(points), UBATCH):
        b = points[i:i+UBATCH]
        for c in [app_coll, "lumina_codebase"]:
            qdrant.upsert(collection_name=c, points=b)
        set_job(progress=min(85+int(10*(i+UBATCH)/max(len(points),1)),94),
                message=f"Stored {min(i+UBATCH,len(points))}/{len(points)} vectors...")
    job["chunks"] = len(points)
    set_job(progress=95, message=f"Indexed {len(points)} vectors.")

def resolve_js_import(fpath, import_path):
    import os
    try:
        dir_name = os.path.dirname(fpath)
        target = os.path.normpath(os.path.join(dir_name, import_path))
        # Find local match ending with suffix or folder index
        for ext in [".ts", ".tsx", ".js", ".jsx"]:
            if os.path.isfile(target + ext):
                return str(os.path.relpath(target + ext, str(REPO_DIR)))
            # check index
            if os.path.isfile(os.path.join(target, "index" + ext)):
                return str(os.path.relpath(os.path.join(target, "index" + ext), str(REPO_DIR)))
    except:
        pass
    return None

def build_graph(repo_url, app_id):
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
        repo_name = repo_url.rstrip("/").split("/")[-1]
        
        # We will collect files first to resolve local imports
        files_list = []
        for fpath in iter_files():
            rel = str(fpath.relative_to(REPO_DIR))
            files_list.append(rel)
            
        with driver.session() as s:
            # Delete old graph for this app to avoid duplicate relations
            s.run("MATCH (n {app_id: $aid}) DETACH DELETE n", aid=app_id)
            
            s.run("MERGE (r:Repo {url:$url,name:$name,app_id:$aid})",
                  url=repo_url, name=repo_name, aid=app_id)
            
            # Create File nodes
            for rel in files_list:
                s.run("MERGE (f:File {path:$p,name:$n,app_id:$a})", p=rel, n=rel.split("/")[-1], a=app_id)
                s.run("MATCH (r:Repo {url:$u}) MATCH (f:File {path:$p}) MERGE (r)-[:CONTAINS {app_id:$a}]->(f)",
                      u=repo_url, p=rel, a=app_id)
            
            # Parse imports and dependencies
            import re
            for fpath in iter_files():
                rel_from = str(fpath.relative_to(REPO_DIR))
                suffix = fpath.suffix.lower()
                content = ""
                try:
                    content = fpath.read_text(encoding="utf-8", errors="ignore")
                except:
                    continue
                    
                imports = []
                externals = []
                
                # JS/TS relative and library imports
                if suffix in (".js", ".jsx", ".ts", ".tsx"):
                    # Matches: import ... from 'path' or require('path')
                    for m in re.finditer(r'(?:import|from)\s+[\'"]([^\'"]+)[\'"]|require\([\'"]([^\'"]+)[\'"]\)', content):
                        val = m.group(1) or m.group(2)
                        if val:
                            if val.startswith("."):
                                resolved = resolve_js_import(fpath, val)
                                if resolved:
                                    imports.append(resolved)
                            else:
                                externals.append(val.split("/")[0])
                            
                # Java imports
                elif suffix in (".java", ".jsp"):
                    # Matches: import package.name.ClassName;
                    for m in re.finditer(r'import\s+([a-zA-Z0-9_\.]+);', content):
                        val = m.group(1)
                        if val:
                            cls_name = val.split(".")[-1]
                            matched_local = False
                            for f in files_list:
                                if f.endswith(f"/{cls_name}.java") or f == f"{cls_name}.java":
                                    imports.append(f)
                                    matched_local = True
                                    break
                            if not matched_local:
                                externals.append(val)
                            
                # Python imports
                elif suffix == ".py":
                    for m in re.finditer(r'import\s+([a-zA-Z0-9_\.]+)|from\s+([a-zA-Z0-9_\.]+)\s+import', content):
                        val = m.group(1) or m.group(2)
                        if val:
                            matched_local = False
                            for f in files_list:
                                name_no_ext = f.replace(".py", "").replace("/", ".")
                                if name_no_ext.endswith(val) or val in name_no_ext:
                                    imports.append(f)
                                    matched_local = True
                                    break
                            if not matched_local:
                                externals.append(val)

                # Terraform module imports
                elif suffix in (".tf", ".tfvars", ".hcl"):
                    for m in re.finditer(r'source\s*=\s*[\'"]([^\'"]+)[\'"]', content):
                        val = m.group(1)
                        if val:
                            if val.startswith("."):
                                matched_local = False
                                for f in files_list:
                                    if val.strip("./") in f:
                                        imports.append(f)
                                        matched_local = True
                                        break
                            else:
                                externals.append(f"tf-module:{val}")

                # Dockerfile container bases
                elif suffix == ".dockerfile" or fpath.name == "Dockerfile":
                    for m in re.finditer(r'(?i)FROM\s+([a-zA-Z0-9_\-\/]+)', content):
                        val = m.group(1)
                        if val and val != "scratch":
                            externals.append(f"docker-image:{val}")
                
                # Write imports to Neo4j
                for rel_to in set(imports):
                    if rel_to != rel_from:
                        s.run("""
                        MATCH (a:File {path:$from_p, app_id:$aid})
                        MATCH (b:File {path:$to_p, app_id:$aid})
                        MERGE (a)-[:IMPORTS {app_id:$aid}]->(b)
                        """, from_p=rel_from, to_p=rel_to, aid=app_id)
                        
                # Write external dependencies to Neo4j
                for ext in set(externals):
                    s.run("""
                    MATCH (a:File {path:$from_p, app_id:$aid})
                    MERGE (b:Library {name:$name, app_id:$aid})
                    MERGE (a)-[:DEPENDS_ON {app_id:$aid}]->(b)
                    """, from_p=rel_from, name=ext, aid=app_id)
                    
        driver.close()
        set_job(progress=97, message="Dependency graph rebuilt successfully.")
    except Exception as e:
        set_job(message=f"Graph skipped: {e}")

def run_reindex_job(req):
    try:
        app_id    = make_app_id(req.repo_url)
        repo_name = req.repo_url.rstrip("/").split("/")[-1]
        display   = repo_name.replace("-"," ").replace("_"," ").title()
        job.update({"started_at":datetime.datetime.utcnow().isoformat(),"finished_at":None,
                    "error":None,"app_id":app_id,"repo_url":req.repo_url,"repo_name":repo_name})
        set_job(status="running", progress=0, message="Starting...")
        clone_repo(req.repo_url, req.git_token or "")
        embed_and_index(req.openai_api_key or OPENAI_KEY, app_id)
        build_graph(req.repo_url, app_id)
        job["finished_at"] = datetime.datetime.utcnow().isoformat()
        set_job(status="done", progress=100,
                message=f"Done — {job['files']} files, {job['chunks']} vectors.")
        reg = load_registry()
        reg[app_id] = {
            "app_id":app_id,"repo_url":req.repo_url,"repo_name":repo_name,
            "display_name":display,"files":job["files"],"chunks":job["chunks"],
            "collection":coll_name(app_id),"indexed_at":job["finished_at"],
            "last_active":job["finished_at"],
        }
        save_registry(reg)
    except Exception as e:
        job["error"] = str(e)
        set_job(status="error", progress=0, message=f"Error: {e}")

class ReindexRequest(BaseModel):
    repo_url:       str
    git_token:      Optional[str] = ""
    openai_api_key: Optional[str] = ""

@app.get("/health")
def health():
    return {"status":"ok","service":"lumina-repo-indexer","version":"3.0.0"}

@app.get("/status")
def status():
    return job

@app.get("/apps")
def list_apps():
    reg = load_registry()
    try:
        from qdrant_client import QdrantClient
        q = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
        collections = q.get_collections().collections
        changed = False
        for c in collections:
            name = c.name
            if name.startswith("app_") and name.endswith("_codebase"):
                app_id = name[4:-9]
                if app_id not in reg and app_id != "lumina":
                    try:
                        info = q.get_collection(name)
                        count = info.points_count
                        # Scroll to find unique files in the payload
                        scroll_res = q.scroll(
                            collection_name=name,
                            limit=10000,
                            with_payload=["file"],
                            with_vectors=False
                        )
                        pts = scroll_res[0] if isinstance(scroll_res, tuple) else scroll_res.points
                        unique_files = len(set(p.payload.get("file") for p in pts if p.payload and p.payload.get("file")))
                    except Exception:
                        unique_files = 0
                        count = 0
                    reg[app_id] = {
                        "app_id": app_id,
                        "repo_url": f"https://github.com/unknown/{app_id}",
                        "repo_name": app_id,
                        "display_name": app_id.replace("_", " ").title(),
                        "files": unique_files,
                        "chunks": count,
                        "collection": name,
                        "indexed_at": datetime.datetime.utcnow().isoformat(),
                        "last_active": datetime.datetime.utcnow().isoformat()
                    }
                    changed = True
        if changed:
            save_registry(reg)
    except Exception as e:
        print(f"[list_apps] Qdrant recovery failed: {e}")
    return {"apps": list(reg.values()), "count": len(reg)}

@app.get("/apps/{app_id}/graph")
def get_app_graph(app_id: str):
    if not NEO4J_URI or not NEO4J_PASS:
        return {"nodes": [], "links": []}
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
        with driver.session() as s:
            q_nodes = """
            MATCH (n)
            WHERE n.app_id = $aid AND (n:File OR n:Library OR n:Repo)
            RETURN id(n) AS nid, labels(n)[0] AS label, n.path AS path, n.name AS name, n.url AS url
            """
            res_nodes = s.run(q_nodes, aid=app_id)
            nodes = []
            node_ids = set()
            for r in res_nodes:
                nid = str(r["nid"])
                node_ids.add(nid)
                nodes.append({
                    "id": nid,
                    "label": r["label"],
                    "name": r["name"] or r["path"] or r["url"] or "Node",
                    "path": r["path"] or "",
                    "url": r["url"] or ""
                })
                
            q_links = """
            MATCH (a)-[r]->(b)
            WHERE r.app_id = $aid OR (a.app_id = $aid AND b.app_id = $aid)
            RETURN id(a) AS source_id, id(b) AS target_id, type(r) AS rel_type
            """
            res_links = s.run(q_links, aid=app_id)
            links = []
            for r in res_links:
                src = str(r["source_id"])
                tgt = str(r["target_id"])
                if src in node_ids and tgt in node_ids:
                    links.append({
                        "source": src,
                        "target": tgt,
                        "type": r["rel_type"]
                    })
        driver.close()
        return {"nodes": nodes, "links": links}
    except Exception as e:
        raise HTTPException(500, f"Graph fetch failed: {e}")

@app.get("/apps/{app_id}")
def get_app(app_id: str):
    reg = load_registry()
    if app_id not in reg: raise HTTPException(404, f"App '{app_id}' not found")
    return reg[app_id]

@app.delete("/apps/{app_id}")
def delete_app(app_id: str):
    reg = load_registry()
    if app_id not in reg: raise HTTPException(404, f"App '{app_id}' not found")
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        q = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
        # 1. Delete codebase collection
        try: q.delete_collection(coll_name(app_id))
        except: pass
        # 2. Delete reference documents collection
        try: q.delete_collection(f"app_{app_id}_documents")
        except: pass
        # 3. Delete generated runbooks matching app_id from lumina_runbooks
        try:
            q.delete(
                collection_name="lumina_runbooks",
                points_selector=Filter(
                    must=[
                        FieldCondition(key="app_id", match=MatchValue(value=app_id))
                    ]
                )
            )
        except: pass
        # 4. Clean up Neo4j Graph elements
        try:
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
            with driver.session() as s:
                s.run("MATCH (n {app_id: $aid}) DETACH DELETE n", aid=app_id)
            driver.close()
        except: pass
    except: pass
    reg.pop(app_id)
    save_registry(reg)
    return {"message": f"App '{app_id}' removed"}
@app.post("/reindex")
def reindex(req: ReindexRequest, bg: BackgroundTasks):
    if job["status"] == "running":
        return {"error": "Indexing in progress. Poll /status."}
    bg.add_task(run_reindex_job, req)
    return {"message":"Indexing started.","app_id":make_app_id(req.repo_url)}

@app.post("/apps/{app_id}/activate")
def activate_app(app_id: str):
    reg = load_registry()
    if app_id not in reg:
        try:
            from qdrant_client import QdrantClient
            q = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
            if q.collection_exists(coll_name(app_id)):
                try:
                    count = q.get_collection(coll_name(app_id)).points_count
                    scroll_res = q.scroll(
                        collection_name=coll_name(app_id),
                        limit=10000,
                        with_payload=["file"],
                        with_vectors=False
                    )
                    pts = scroll_res[0] if isinstance(scroll_res, tuple) else scroll_res.points
                    unique_files = len(set(p.payload.get("file") for p in pts if p.payload and p.payload.get("file")))
                except:
                    count = 0
                    unique_files = 0
                reg[app_id] = {
                    "app_id": app_id,
                    "repo_url": f"https://github.com/unknown/{app_id}",
                    "repo_name": app_id,
                    "display_name": app_id.replace("_", " ").title(),
                    "files": unique_files,
                    "chunks": count,
                    "collection": coll_name(app_id),
                    "indexed_at": datetime.datetime.utcnow().isoformat(),
                    "last_active": datetime.datetime.utcnow().isoformat()
                }
                save_registry(reg)
            else:
                raise HTTPException(404, f"App '{app_id}' not found")
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(404, f"App '{app_id}' not found: {e}")
    info = reg[app_id]
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams, PointStruct
        q = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
        try: q.delete_collection("lumina_codebase")
        except: pass
        q.create_collection("lumina_codebase",
                            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE))
        offset, total = None, 0
        while True:
            result = q.scroll(collection_name=coll_name(app_id), limit=100,
                               offset=offset, with_vectors=True)
            # qdrant-client returns (points, next_offset) tuple or ScrollResult
            if isinstance(result, tuple):
                pts, offset = result
            else:
                pts    = result.points
                offset = result.next_page_offset
            if not pts:
                break
            pts_to_upsert = [PointStruct(id=p.id, vector=p.vector, payload=p.payload) for p in pts]
            q.upsert(collection_name="lumina_codebase", points=pts_to_upsert)
            total += len(pts)
            if offset is None:
                break
        reg[app_id]["last_active"] = datetime.datetime.utcnow().isoformat()
        save_registry(reg)
        job.update({"app_id":app_id,"repo_url":info["repo_url"],"repo_name":info["repo_name"],
                    "files":info["files"],"chunks":info["chunks"],"status":"done",
                    "message":f"Active: {info['display_name']}","progress":100})
        return {"message":f"Activated {info['display_name']}","vectors_copied":total}
    except Exception as e:
        raise HTTPException(500, f"Activation failed: {e}")

@app.post("/reset")
def reset_job():
    job.update({"status":"idle","progress":0,"message":"Ready.","app_id":"","repo_url":"",
                "repo_name":"","files":0,"chunks":0,"started_at":None,"finished_at":None,"error":None})
    return {"message":"Reset."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
