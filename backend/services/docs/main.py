"""
Lumina Reference Documents Agent  —  port 8006
Per-app document collections keyed by app_id.
"""
import os, io, uuid, json, datetime, hashlib
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from qdrant_client import QdrantClient
from llm_client import complete, embed, DEFAULT_MODEL
from qdrant_client.models import Distance, VectorParams, PointStruct

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
PORT       = int(os.environ.get("PORT", "8006"))
EMBED_MODEL= "text-embedding-3-small"
EMBED_DIM  = 1536
CHUNK_CHARS= 600
OVERLAP    = 100

oai    = OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
app    = FastAPI(title="Lumina Reference Docs Agent", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Per-app document registry: {app_id: {doc_id: doc_info}}
_app_docs: dict[str, dict] = {}

def docs_collection(app_id: str) -> str:
    return f"docs_{app_id}" if app_id else "lumina_documents"

def ensure_collection(app_id: str):
    coll = docs_collection(app_id)
    try:
        qdrant.get_collection(coll)
    except Exception:
        qdrant.create_collection(coll, vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE))

def qdrant_search(coll: str, query_vector, top_k=5):
    try:
        return qdrant.query_points(collection_name=coll, query=query_vector, limit=top_k).points
    except AttributeError:
        return qdrant.search(collection_name=coll, query_vector=query_vector, limit=top_k)

def chunk_text(text: str) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start+CHUNK_CHARS])
        start += CHUNK_CHARS - OVERLAP
    return chunks

def extract_text(filename: str, content: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext in ("txt", "md"):
        return content.decode("utf-8", errors="ignore")
    if ext == "pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except ImportError:
            return content.decode("utf-8", errors="ignore")
    if ext == "docx":
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            return content.decode("utf-8", errors="ignore")
    return content.decode("utf-8", errors="ignore")

class DocQuery(BaseModel):
    question: str
    top_k: int = 6
    app_id: Optional[str] = ""
    model: str = DEFAULT_MODEL
    api_key: str = ""

@app.get("/health")
def health():
    return {"status":"ok","service":"lumina-docs-agent"}

def ensure_docs_loaded(app_id: str):
    if not app_id:
        return {}
    if app_id not in _app_docs or not _app_docs[app_id]:
        try:
            coll = docs_collection(app_id)
            if qdrant.collection_exists(coll):
                result = qdrant.scroll(
                    collection_name=coll,
                    limit=1000,
                    with_vectors=False,
                    with_payload=True
                )
                if isinstance(result, tuple):
                    pts = result[0]
                else:
                    pts = result.points
                
                recovered = {}
                for p in pts:
                    pay = p.payload
                    doc_id = pay.get("doc_id")
                    if doc_id and doc_id not in recovered:
                        recovered[doc_id] = {
                            "id": doc_id,
                            "name": pay.get("doc_name", "Recovered Document"),
                            "type": pay.get("doc_type", "General"),
                            "size_kb": 0.0,
                            "indexed_at": datetime.datetime.utcnow().isoformat(),
                            "chunks": 1,
                            "status": "indexed",
                            "app_id": app_id
                        }
                    elif doc_id:
                        recovered[doc_id]["chunks"] += 1
                if recovered:
                    if app_id not in _app_docs:
                        _app_docs[app_id] = {}
                    _app_docs[app_id].update(recovered)
        except Exception as e:
            print(f"[docs] Recovery from Qdrant failed: {e}")
    return _app_docs.get(app_id, {})

@app.get("/documents")
def list_documents(app_id: str = Query(default="")):
    docs = ensure_docs_loaded(app_id)
    if not docs:
        return {"documents":[],"mode":"empty","app_id":app_id,
                "message":"No documents uploaded for this application yet."}
    return {"documents":list(docs.values()),"mode":"live","count":len(docs),"app_id":app_id}

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(default="General"),
    app_id: str = Form(default=""),
):
    if not oai:
        raise HTTPException(500, "OPENAI_API_KEY not configured")
    ensure_collection(app_id)
    coll    = docs_collection(app_id)
    content = await file.read()
    text    = extract_text(file.filename, content)
    if not text.strip():
        raise HTTPException(400, "Could not extract text from this file")
    doc_id = str(uuid.uuid4())[:8]
    chunks = chunk_text(text)
    points = []
    BATCH  = 20
    for i in range(0, len(chunks), BATCH):
        batch   = chunks[i:i+BATCH]
        vectors = oai.embeddings.create(model=EMBED_MODEL, input=batch).data
        for j, (chunk, emb) in enumerate(zip(batch, vectors)):
            cid = abs(int(hashlib.md5(f"{doc_id}:{i+j}".encode()).hexdigest()[:8],16))
            points.append(PointStruct(id=cid, vector=emb.embedding,
                payload={"doc_id":doc_id,"doc_name":file.filename,"doc_type":doc_type,
                         "chunk_index":i+j,"text":chunk[:300],"app_id":app_id}))
    for i in range(0, len(points), 50):
        qdrant.upsert(collection_name=coll, points=points[i:i+50])
    if app_id not in _app_docs:
        _app_docs[app_id] = {}
    _app_docs[app_id][doc_id] = {
        "id":doc_id,"name":file.filename,"type":doc_type,
        "size_kb":round(len(content)/1024,1),
        "indexed_at":datetime.datetime.utcnow().isoformat(),
        "chunks":len(chunks),"status":"indexed","app_id":app_id,
    }
    return {"message":f"Indexed {len(chunks)} chunks from {file.filename}","doc_id":doc_id}

@app.post("/query")
def query_documents(req: DocQuery):
    app_id = req.app_id or ""
    docs   = ensure_docs_loaded(app_id)
    if not oai:
        raise HTTPException(500, "OPENAI_API_KEY not configured")
    if not docs:
        return {"answer":"No documents have been uploaded for this application yet. Upload a Functional Spec, Architecture doc, or Configuration guide to get answers from your actual documentation.",
                "sources":[],"mode":"empty"}
    ensure_collection(app_id)
    coll = docs_collection(app_id)
    emb  = oai.embeddings.create(model=EMBED_MODEL, input=req.question).data[0].embedding
    hits = qdrant_search(coll, emb, req.top_k)
    if not hits:
        return {"answer":"No relevant content found in uploaded documents.","sources":[],"mode":"empty"}
    context = "\n---\n".join(f"[{h.payload.get('doc_name','?')}]\n{h.payload.get('text','')}" for h in hits)
    try:
        answer = complete(
            model=req.model,
            messages=[
                {"role":"system","content":"You are a knowledgeable assistant for an application transition team. Answer questions using the provided document excerpts. Always cite the source document name."},
                {"role":"user","content":f"Documents:\n{context}\n\nQuestion: {req.question}"},
            ],
            max_tokens=800, temperature=0.1,
        )
    except Exception as e:
        raise HTTPException(500, f"LLM error ({req.model}): {e}")
    sources = [{"doc":h.payload.get("doc_name","?"),"section":f"Chunk {h.payload.get('chunk_index',0)}",
                "relevance":round(getattr(h,"score",0.8),2)} for h in hits[:3]]
    return {"answer":answer,"sources":sources,"mode":"live"}

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str, app_id: str = Query(default="")):
    docs = ensure_docs_loaded(app_id)
    if doc_id not in docs:
        raise HTTPException(404, "Document not found")
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        coll = docs_collection(app_id)
        qdrant.delete(
            collection_name=coll,
            points_selector=Filter(
                must=[
                    FieldCondition(key="doc_id", match=MatchValue(value=doc_id))
                ]
            )
        )
    except Exception as e:
        print(f"[docs] Error deleting from Qdrant: {e}")
    docs.pop(doc_id)
    return {"message":f"Document {doc_id} removed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)


# ══════════════════════════════════════════════════════════════
#  Confluence integration
# ══════════════════════════════════════════════════════════════
import urllib.request
import base64

class ConfluenceRequest(BaseModel):
    base_url: str          # e.g. https://your-org.atlassian.net
    username: str          # Atlassian account email
    api_token: str         # Atlassian API token
    space_key: str = ""    # e.g. "ENG" — leave blank to fetch all spaces
    app_id: str = ""
    max_pages: int = 50

@app.post("/fetch-confluence")
async def fetch_confluence(req: ConfluenceRequest):
    """
    Fetches pages from a Confluence space and indexes them into Qdrant.
    Uses Confluence REST API v2 with basic auth (email + API token).
    """
    if not oai:
        raise HTTPException(500, "OPENAI_API_KEY not configured")

    base = req.base_url.rstrip("/")
    creds = base64.b64encode(f"{req.username}:{req.api_token}".encode()).decode()
    headers = {"Authorization": f"Basic {creds}", "Accept": "application/json"}

    def cf_get(path: str) -> dict:
        url = f"{base}/wiki/rest/api/{path}"
        r = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(r, timeout=15) as resp:
            return json.loads(resp.read())

    # Step 1: resolve spaces to fetch
    try:
        if req.space_key:
            spaces = [req.space_key]
        else:
            data = cf_get("space?limit=25&type=global")
            spaces = [s["key"] for s in data.get("results", [])]
            if not spaces:
                raise HTTPException(400, "No spaces found in this Confluence instance")
    except urllib.error.HTTPError as e:
        raise HTTPException(e.code, f"Confluence authentication failed: {e.reason}. Check your base_url, username, and API token.")
    except Exception as e:
        raise HTTPException(500, f"Could not connect to Confluence: {e}")

    # Step 2: fetch pages from each space
    all_pages = []
    for space_key in spaces[:5]:  # cap at 5 spaces
        try:
            limit = min(req.max_pages, 50)
            data = cf_get(
                f"content?spaceKey={space_key}&type=page"
                f"&expand=body.storage,title,space"
                f"&limit={limit}&status=current"
            )
            for page in data.get("results", []):
                title   = page.get("title", "Untitled")
                body    = page.get("body", {}).get("storage", {}).get("value", "")
                # Strip HTML tags
                import re
                clean = re.sub(r"<[^>]+>", " ", body)
                clean = re.sub(r"\s+", " ", clean).strip()
                if clean:
                    all_pages.append({
                        "title":  title,
                        "space":  space_key,
                        "url":    f"{base}/wiki/spaces/{space_key}/pages/{page.get('id','')}",
                        "text":   clean,
                    })
        except Exception as e:
            print(f"[confluence] Error fetching space {space_key}: {e}")
            continue

    if not all_pages:
        raise HTTPException(400, "No pages found. Check space key and permissions.")

    # Step 3: chunk, embed, and index into Qdrant
    ensure_collection(req.app_id)
    coll   = docs_collection(req.app_id)
    points = []
    BATCH  = 20

    for page in all_pages:
        chunks = chunk_text(page["text"])
        for i in range(0, len(chunks), BATCH):
            batch   = chunks[i:i+BATCH]
            vectors = oai.embeddings.create(model=EMBED_MODEL, input=batch).data
            for j, (chunk, emb) in enumerate(zip(batch, vectors)):
                cid = abs(int(hashlib.md5(f"{page['url']}:{i+j}".encode()).hexdigest()[:8], 16))
                points.append(PointStruct(
                    id=cid, vector=emb.embedding,
                    payload={
                        "doc_id":   f"cf_{cid}",
                        "doc_name": f"[Confluence] {page['title']}",
                        "doc_type": "Confluence",
                        "space":    page["space"],
                        "url":      page["url"],
                        "chunk_index": i + j,
                        "text":     chunk[:300],
                        "app_id":   req.app_id,
                    }
                ))

    for i in range(0, len(points), 50):
        qdrant.upsert(collection_name=coll, points=points[i:i+50])

    # Register in doc registry
    if req.app_id not in _app_docs:
        _app_docs[req.app_id] = {}

    doc_id = f"confluence_{req.space_key or 'all'}"
    _app_docs[req.app_id][doc_id] = {
        "id":         doc_id,
        "name":       f"Confluence — {req.space_key or 'all spaces'} ({len(all_pages)} pages)",
        "type":       "Confluence",
        "source":     "confluence",
        "base_url":   req.base_url,
        "space_key":  req.space_key,
        "size_kb":    round(sum(len(p["text"]) for p in all_pages) / 1024, 1),
        "indexed_at": datetime.datetime.utcnow().isoformat(),
        "chunks":     len(points),
        "status":     "indexed",
        "app_id":     req.app_id,
    }

    return {
        "message":      f"Indexed {len(all_pages)} Confluence pages ({len(points)} chunks)",
        "pages_fetched": len(all_pages),
        "chunks_indexed": len(points),
        "spaces":       list(set(p["space"] for p in all_pages)),
        "doc_id":       doc_id,
    }
