"""
Lumina Doc Generation Agent — fixed for qdrant-client v1.7+
"""
import os, json, datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from qdrant_client import QdrantClient
from llm_client import complete, embed, DEFAULT_MODEL

OPENAI_KEY = os.environ["OPENAI_API_KEY"]
QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
PORT       = int(os.environ.get("PORT", "8002"))
COLLECTION = "lumina_codebase"

oai    = OpenAI(api_key=OPENAI_KEY)
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
app    = FastAPI(title="Lumina Doc Generation Agent", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

LUMINA_AGENTS = ["opportunity","persona","discovery","quality","kpi",
                 "model","pipeline","validation","documentation","governance","publishing"]

class DocRequest(BaseModel):
    doc_type: str
    subject: str
    app_id: str = ""
    model: str = DEFAULT_MODEL
    api_key: str = ""

class GeneratedDoc(BaseModel):
    id: str | None = None
    title: str
    content: str
    word_count: int
    generated_at: str
    app_id: str | None = None

def qdrant_search(query_vector, top_k=5):
    try:
        results = qdrant.query_points(
            collection_name=COLLECTION, query=query_vector, limit=top_k
        )
        return results.points
    except AttributeError:
        return qdrant.search(
            collection_name=COLLECTION, query_vector=query_vector, limit=top_k
        )

def fetch_context(query):
    try:
        emb  = embed(query)
        hits = qdrant_search(emb)
        return "\n---\n".join(
            f"[{h.payload.get('file','?')}]\n{h.payload.get('text','')}" for h in hits
        )
    except Exception as e:
        return f"[RAG unavailable: {e}]"

PROMPTS = {
    "runbook": "You are a technical writer for the application described in the codebase context. Write a concise runbook for '{subject}' covering: purpose, inputs/outputs, common failure modes, and recovery steps. Ground your answer in the actual codebase context provided.",
    "playbook": "You are a support engineer. Write an incident playbook for '{subject}' failures covering: symptoms, triage steps, root causes, resolution, and validation. Reference actual files from the codebase context where relevant.",
}

def generate_doc(doc_type, subject, model=DEFAULT_MODEL, api_key=None):
    context = fetch_context(f"Lumina {subject} {doc_type}")
    prompt  = PROMPTS.get(doc_type, PROMPTS["runbook"]).replace("{subject}", subject)
    try:
        content = complete(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user",   "content": f"Context:\n{context}\n\nGenerate documentation now."},
            ],
            model=model, api_key=api_key,
            max_tokens=1500, temperature=0.2,
        )
    except Exception as e:
        content = f"Error generating documentation with model {model}: {e}"
    return GeneratedDoc(
        title=f"{doc_type.title()}: {subject}",
        content=content,
        word_count=len(content.split()),
        generated_at=datetime.datetime.utcnow().isoformat(),
    )

RUNBOOKS_COLL = "lumina_runbooks"

def ensure_runbooks_collection():
    try:
        from qdrant_client.models import Distance, VectorParams
        if not qdrant.collection_exists(RUNBOOKS_COLL):
            qdrant.create_collection(
                collection_name=RUNBOOKS_COLL,
                vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE)
            )
    except Exception as e:
        print(f"[docgen] Error ensuring runbooks collection: {e}")

def save_runbook(app_id: str, doc: GeneratedDoc):
    if not app_id:
        return
    ensure_runbooks_collection()
    import hashlib
    from qdrant_client.models import PointStruct
    doc_id = hashlib.md5(f"{app_id}:{doc.title}".encode()).hexdigest()
    cid = abs(int(doc_id[:8], 16))
    
    try:
        query_vector = embed(doc.title)
    except Exception:
        query_vector = [0.0] * EMBED_DIM
        
    try:
        qdrant.upsert(
            collection_name=RUNBOOKS_COLL,
            points=[
                PointStruct(
                    id=cid,
                    vector=query_vector,
                    payload={
                        "app_id": app_id,
                        "doc_id": doc_id,
                        "title": doc.title,
                        "content": doc.content,
                        "word_count": doc.word_count,
                        "generated_at": doc.generated_at
                    }
                )
            ]
        )
        doc.id = doc_id
        doc.app_id = app_id
    except Exception as e:
        print(f"[docgen] Error saving runbook: {e}")

class SaveRequest(BaseModel):
    app_id: str
    title: str
    content: str

@app.post("/runbooks")
def save_generated_runbook(req: SaveRequest):
    ensure_runbooks_collection()
    import hashlib
    from qdrant_client.models import PointStruct
    doc_id = hashlib.md5(f"{req.app_id}:{req.title}".encode()).hexdigest()
    cid = abs(int(doc_id[:8], 16))
    
    try:
        query_vector = embed(req.title)
    except Exception:
        query_vector = [0.0] * EMBED_DIM
        
    try:
        qdrant.upsert(
            collection_name=RUNBOOKS_COLL,
            points=[
                PointStruct(
                    id=cid,
                    vector=query_vector,
                    payload={
                        "app_id": req.app_id,
                        "doc_id": doc_id,
                        "title": req.title,
                        "content": req.content,
                        "word_count": len(req.content.split()),
                        "generated_at": datetime.datetime.utcnow().isoformat()
                    }
                )
            ]
        )
        return {"message": "Runbook saved successfully", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(500, f"Failed to save runbook: {e}")

@app.get("/health")
def health():
    return {"status": "ok", "service": "lumina-docgen-agent"}

@app.post("/generate", response_model=GeneratedDoc)
def generate(req: DocRequest):
    if req.doc_type not in PROMPTS:
        raise HTTPException(400, f"doc_type must be: {list(PROMPTS.keys())}")
    doc = generate_doc(req.doc_type, req.subject, model=req.model, api_key=req.api_key or None)
    return doc

@app.get("/runbooks")
def list_runbooks(app_id: str):
    ensure_runbooks_collection()
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        scroll_filter = Filter(
            must=[
                FieldCondition(key="app_id", match=MatchValue(value=app_id))
            ]
        )
        result = qdrant.scroll(
            collection_name=RUNBOOKS_COLL,
            scroll_filter=scroll_filter,
            limit=100,
            with_vectors=False,
            with_payload=True
        )
        if isinstance(result, tuple):
            pts = result[0]
        else:
            pts = result.points
            
        docs = []
        for p in pts:
            pay = p.payload
            docs.append({
                "id": pay.get("doc_id"),
                "title": pay.get("title"),
                "content": pay.get("content"),
                "word_count": pay.get("word_count", 0),
                "generated_at": pay.get("generated_at"),
                "app_id": pay.get("app_id")
            })
        docs.sort(key=lambda x: x.get("generated_at", ""), reverse=True)
        return {"runbooks": docs, "count": len(docs)}
    except Exception as e:
        raise HTTPException(500, f"Failed to retrieve runbooks: {e}")

@app.delete("/runbooks/{doc_id}")
def delete_runbook(doc_id: str):
    ensure_runbooks_collection()
    try:
        cid = abs(int(doc_id[:8], 16))
        qdrant.delete(
            collection_name=RUNBOOKS_COLL,
            points_selector=[cid]
        )
        return {"message": "Runbook deleted"}
    except Exception as e:
        raise HTTPException(500, f"Failed to delete runbook: {e}")

@app.post("/generate-all-runbooks")
def generate_all():
    results = []
    for agent in LUMINA_AGENTS:
        doc = generate_doc("runbook", agent, model=DEFAULT_MODEL)
        results.append({"agent": agent, "words": doc.word_count})
    return {"generated": len(results), "agents": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
