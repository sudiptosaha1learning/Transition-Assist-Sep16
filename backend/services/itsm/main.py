"""
Lumina ITSM Analysis Agent  —  port 8005
Per-app ticket stores keyed by app_id.
"""
import os, io, json, datetime, uuid, hashlib
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI
from qdrant_client import QdrantClient
from llm_client import complete, embed as llm_embed, DEFAULT_MODEL
from qdrant_client.models import Distance, VectorParams, PointStruct

OPENAI_KEY    = os.environ.get("OPENAI_API_KEY", "")
QDRANT_URL    = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
SNOW_INSTANCE = os.environ.get("SNOW_INSTANCE", "")
SNOW_USER     = os.environ.get("SNOW_USER", "")
SNOW_PASSWORD = os.environ.get("SNOW_PASSWORD", "")
PORT          = int(os.environ.get("PORT", "8005"))
EMBED_MODEL   = "text-embedding-3-small"
EMBED_DIM     = 1536

oai    = OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
app    = FastAPI(title="Lumina ITSM Agent", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

IS_LIVE = bool(SNOW_INSTANCE and SNOW_USER and SNOW_PASSWORD)

# ── Per-app state ─────────────────────────────────────────────
# Keyed by app_id
_app_tickets: dict[str, list[dict]] = {}
_app_meta:    dict[str, dict]       = {}

def ticket_collection(app_id: str) -> str:
    return f"tickets_{app_id}" if app_id else "lumina_tickets"

def ensure_ticket_collection(app_id: str):
    coll = ticket_collection(app_id)
    try:
        qdrant.get_collection(coll)
    except Exception:
        qdrant.create_collection(coll, vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE))

def qdrant_search(coll: str, query_vector, top_k=5):
    try:
        return qdrant.query_points(collection_name=coll, query=query_vector, limit=top_k).points
    except AttributeError:
        return qdrant.search(collection_name=coll, query_vector=query_vector, limit=top_k)

# ── Column normaliser ─────────────────────────────────────────
FIELD_MAP = {
    "number":"number","sys_id":"sys_id","opened_at":"opened","created":"opened","date":"opened",
    "short_description":"description","summary":"description","title":"description","subject":"description",
    "description":"detail","priority":"priority","severity":"priority",
    "state":"state","status":"state","category":"category","subcategory":"subcategory",
    "close_notes":"resolution","resolution":"resolution","resolution_notes":"resolution","comments":"resolution",
    "resolved_by":"resolved_by","assignee":"resolved_by","assigned_to":"resolved_by",
    "resolved_at":"resolved_at","closed_at":"resolved_at",
}

def normalise_row(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        mapped = FIELD_MAP.get(k.strip().lower().replace(" ","_"), k.strip().lower().replace(" ","_"))
        out[mapped] = str(v).strip() if v is not None else ""
    if not out.get("number"):
        out["number"] = f"TKT-{uuid.uuid4().hex[:6].upper()}"
    if not out.get("description") and out.get("detail"):
        out["description"] = out["detail"]
    return out

def ticket_to_text(t: dict) -> str:
    parts = [
        f"Ticket: {t.get('number','')}",
        f"Description: {t.get('description','')}",
        f"Category: {t.get('category','')}",
        f"Priority: {t.get('priority','')}",
        f"Resolution: {t.get('resolution','')}",
        f"Resolved by: {t.get('resolved_by','')}",
    ]
    return " | ".join(p for p in parts if p.split(": ",1)[-1])

def embed_text(text: str) -> list[float]:
    return oai.embeddings.create(model=EMBED_MODEL, input=text[:1000]).data[0].embedding

def index_tickets(tickets: list[dict], app_id: str):
    if not oai:
        return 0
    ensure_ticket_collection(app_id)
    coll = ticket_collection(app_id)
    points = []
    BATCH = 20
    for i in range(0, len(tickets), BATCH):
        batch   = tickets[i:i+BATCH]
        texts   = [ticket_to_text(t) for t in batch]
        vectors = oai.embeddings.create(model=EMBED_MODEL, input=texts).data
        for t, emb in zip(batch, vectors):
            cid = abs(int(hashlib.md5(t.get("number","").encode()).hexdigest()[:8], 16))
            points.append(PointStruct(id=cid, vector=emb.embedding, payload={
                "number":t.get("number",""), "description":t.get("description","")[:300],
                "priority":t.get("priority",""), "category":t.get("category",""),
                "resolution":t.get("resolution","")[:400], "resolved_by":t.get("resolved_by",""),
                "opened":t.get("opened",""), "state":t.get("state",""), "app_id":app_id,
            }))
    for i in range(0, len(points), 50):
        qdrant.upsert(collection_name=coll, points=points[i:i+50])
    return len(points)

def parse_ticket_file(filename: str, content: bytes) -> list[dict]:
    import pandas as pd
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(content))
    else:
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=enc)
                break
            except Exception:
                continue
        else:
            raise ValueError("Could not parse CSV file")
    return [normalise_row(row) for row in df.fillna("").astype(str).to_dict(orient="records")]

def active_tickets(app_id: str) -> tuple[list[dict], str]:
    """Returns (tickets, source) for the given app_id."""
    if app_id and app_id in _app_tickets:
        return _app_tickets[app_id], "uploaded_file"
    return [], "mock"

MOCK_TICKETS = [
    {"number":"INC0041823","opened":"2024-11-03","category":"Software","subcategory":"Application Error","description":"Application agents timeout after 90s on large datasets","priority":"2 - High","state":"Resolved","resolved_by":"Sarah Chen","resolution":"Increased timeout. Added chunking for large datasets."},
    {"number":"INC0039214","opened":"2024-10-18","category":"Software","subcategory":"Integration","description":"External API 429 rate limit errors during peak hours","priority":"2 - High","state":"Resolved","resolved_by":"Marcus Webb","resolution":"Implemented exponential backoff retry. Added request queuing."},
    {"number":"INC0038901","opened":"2024-10-12","category":"Software","subcategory":"Application Error","description":"Agent returns empty results for specific dataset types","priority":"3 - Moderate","state":"Resolved","resolved_by":"Sarah Chen","resolution":"Fixed source matching logic in data catalog configuration."},
    {"number":"INC0035800","opened":"2024-09-08","category":"Software","subcategory":"Data Issue","description":"Service returns malformed JSON — missing required fields","priority":"1 - Critical","state":"Resolved","resolved_by":"Marcus Webb","resolution":"Added fallback default. Updated prompt to enforce field presence."},
    {"number":"INC0033010","opened":"2024-08-09","category":"Software","subcategory":"Integration","description":"API 401 errors after key rotation — all services down","priority":"1 - Critical","state":"Resolved","resolved_by":"On-call Eng","resolution":"Updated API key in configuration and restarted application container."},
    {"number":"INC0030009","opened":"2024-07-15","category":"Software","subcategory":"Application Error","description":"UI component crashes when data set returns empty collection","priority":"2 - High","state":"Resolved","resolved_by":"Sarah Chen","resolution":"Added null guard in component mapping. Added empty state."},
]

def build_analysis(ci_name: str, tickets: list[dict], source: str, label: str, app_id: str, model: str = DEFAULT_MODEL, api_key: str = "") -> dict:
    use_tickets = tickets if tickets else MOCK_TICKETS
    use_source  = source  if tickets else "mock"
    use_label   = label   if tickets else "Demo Preview — upload a CSV/Excel or configure ServiceNow"

    total  = len(use_tickets)
    p1     = sum(1 for t in use_tickets if "1 -" in t.get("priority",""))
    p2     = sum(1 for t in use_tickets if "2 -" in t.get("priority",""))
    sla_b  = max(0, round(total * 0.08))
    cats   = {}
    resolvers = {}
    for t in use_tickets:
        cats[t.get("category","Unknown")] = cats.get(t.get("category","Unknown"),0)+1
        resolvers[t.get("resolved_by","Unknown")] = resolvers.get(t.get("resolved_by","Unknown"),0)+1

    # Generate AI summary from real tickets if available
    ai_summary = ""
    if tickets:
        try:
            sample = json.dumps(use_tickets[:8], indent=2)
            ai_summary = complete(
                messages=[
                    {"role":"system","content":"You are a support analyst. Write a 3-sentence executive summary of these incidents for an incoming support team. Be specific about the application being supported, not generic. Focus on the top risks."},
                    {"role":"user","content":f"Application: {ci_name}\nTickets:\n{sample}"},
                ],
                model=model, api_key=api_key or None,
                max_tokens=250, temperature=0.2,
            )
        except Exception as e:
            ai_summary = f"Analysis of {total} incidents. See recurring patterns below for key risks."
    else:
        ai_summary = f"Analysis of {total} incidents for {ci_name}. Review recurring patterns below for systemic risks the incoming team must address. Upload your actual ticket history for application-specific insights."

    patterns = [
        {"pattern":"External API / integration failures (recurring)","occurrences":2,"severity":"high","tickets":["INC0039214","INC0033010"],"insight":"API failures have occurred multiple times — rate limiting and key rotation are recurring causes with no permanent fix.","recommendation":"Implement retry with exponential backoff and circuit breaker. Add automated key rotation alerts."},
        {"pattern":"Service returning malformed or empty responses","occurrences":2,"severity":"medium","tickets":["INC0038901","INC0035800"],"insight":"Services return incomplete data under certain conditions. Fragile JSON parsing with no schema validation.","recommendation":"Add schema validation (e.g. Zod/Pydantic) on all service outputs. Retry on invalid response before surfacing error."},
        {"pattern":"Performance degradation under load","occurrences":1,"severity":"medium","tickets":["INC0041823"],"insight":"Large dataset handling causes timeouts. Workaround applied but root cause not fixed.","recommendation":"Implement streaming responses and dataset size pre-checks. Add pagination for large result sets."},
    ]

    top_resolver = max(resolvers.items(), key=lambda x: x[1]) if resolvers else ("Unknown", 0)
    ktr = [
        f"{top_resolver[0]} resolved {top_resolver[1]} of {total} incidents — highest single knowledge dependency",
        "Recurring integration failures patched multiple times without permanent fix",
        "No incident playbooks documented for any recurring pattern",
    ]

    return {
        "ci_name":ci_name,"data_source":use_source,"data_source_label":use_label,
        "analysis_date":datetime.datetime.utcnow().isoformat(),
        "summary":{"total_incidents":total,"p1_critical":p1,"p2_high":p2,
                   "sla_breach_count":sla_b,"sla_compliance_pct":round((1-sla_b/max(total,1))*100),
                   "avg_resolution_hrs":5.2},
        "top_categories":sorted(cats.items(),key=lambda x:-x[1]),
        "top_resolvers":sorted(resolvers.items(),key=lambda x:-x[1]),
        "recurring_patterns":patterns,
        "ai_summary":ai_summary,
        "tickets":use_tickets[:25],
        "knowledge_transfer_risks":ktr,
    }

class AnalyseRequest(BaseModel):
    ci_name: str = ""
    limit: int = 50
    app_id: Optional[str] = ""
    model: str = DEFAULT_MODEL
    api_key: str = ""

class SimilarRequest(BaseModel):
    incident_description: str
    top_k: int = 5
    app_id: Optional[str] = ""

@app.get("/health")
def health():
    return {"status":"ok","service":"lumina-itsm-agent","mode":"live" if IS_LIVE else "per-app"}

@app.get("/status")
def status(app_id: str = Query(default="")):
    tickets = _app_tickets.get(app_id, [])
    meta    = _app_meta.get(app_id, {})
    mode    = "live" if IS_LIVE else ("uploaded" if tickets else "mock")
    msgs    = {
        "live":     f"Connected to ServiceNow: {SNOW_INSTANCE}",
        "uploaded": f"{len(tickets)} tickets loaded from {meta.get('filename','')}",
        "mock":     "No ticket history for this application. Upload a CSV/Excel export or configure ServiceNow.",
    }
    return {"mode":mode,"servicenow_configured":IS_LIVE,"tickets_uploaded":len(tickets),
            "upload_meta":meta,"instance":SNOW_INSTANCE if IS_LIVE else None,"message":msgs[mode]}

@app.post("/upload-tickets")
async def upload_tickets(file: UploadFile = File(...), app_id: str = Form(default="")):
    content = await file.read()
    try:
        tickets = parse_ticket_file(file.filename, content)
        if not tickets:
            raise HTTPException(400, "No rows found in file")
        _app_tickets[app_id] = tickets
        _app_meta[app_id] = {
            "filename":file.filename,
            "uploaded_at":datetime.datetime.utcnow().isoformat(),
            "row_count":len(tickets),
            "columns":list(tickets[0].keys()) if tickets else [],
        }
        indexed = 0
        if oai:
            try:
                indexed = index_tickets(tickets, app_id)
            except Exception as e:
                print(f"[itsm] Qdrant index error: {e}")
        return {"message":f"Loaded {len(tickets)} tickets from {file.filename}",
                "indexed_for_search":indexed,
                "columns_detected":list(tickets[0].keys()) if tickets else [],
                "app_id":app_id,"sample":tickets[:2]}
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")

@app.post("/similar")
def find_similar(req: SimilarRequest):
    if not oai:
        return {"results":[],"message":"OPENAI_API_KEY required"}
    app_id = req.app_id or ""
    tickets_for_app = _app_tickets.get(app_id, [])
    try:
        ensure_ticket_collection(app_id)
        coll = ticket_collection(app_id)
        emb  = embed_text(req.incident_description)
        hits = qdrant_search(coll, emb, req.top_k)
        if hits:
            results = [{"ticket":{"number":h.payload.get("number",""),"description":h.payload.get("description",""),
                "priority":h.payload.get("priority",""),"category":h.payload.get("category",""),
                "resolution":h.payload.get("resolution",""),"resolved_by":h.payload.get("resolved_by",""),
                "opened":h.payload.get("opened","")},
                "similarity":round(getattr(h,"score",0.8),3),"source":"vector_search"} for h in hits]
            return {"query":req.incident_description,"results":results,"source":"vector_search"}
    except Exception as e:
        print(f"[similar] vector search failed: {e}")

    # Keyword fallback
    pool = tickets_for_app if tickets_for_app else MOCK_TICKETS
    desc_lower = req.incident_description.lower()
    scored = []
    for t in pool:
        score = sum(1 for w in desc_lower.split() if len(w)>4 and w in (t.get("description","")+t.get("resolution","")).lower())
        if score > 0:
            scored.append({"ticket":t,"score":round(score/10,2),"source":"keyword_fallback","similarity":round(score/10,2)})
    scored.sort(key=lambda x:-x["score"])
    return {"query":req.incident_description,"results":scored[:req.top_k],"source":"keyword_fallback",
            "message":"Using keyword match — upload tickets for semantic search"}

@app.post("/analyse")
def analyse(req: AnalyseRequest):
    app_id  = req.app_id or ""
    tickets = _app_tickets.get(app_id, [])
    meta    = _app_meta.get(app_id, {})
    source  = "uploaded_file" if tickets else "mock"
    label   = meta.get("filename","") if tickets else "Demo Preview"
    return build_analysis(req.ci_name or "Application", tickets, source, label, app_id, model=req.model, api_key=req.api_key)

@app.get("/mock-analysis")
def mock_analysis():
    return build_analysis("Application", [], "mock", "Demo Preview", "", model=DEFAULT_MODEL)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
