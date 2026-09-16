"""
Lumina Triage Agent — fixed for qdrant-client v1.7+
Uses direct OpenAI calls (not LangGraph) — honest, functional, demo-ready.
"""
import os, json, datetime, uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from qdrant_client import QdrantClient
from llm_client import complete, complete_json, embed, DEFAULT_MODEL
import pg8000.dbapi
from urllib.parse import urlparse

OPENAI_KEY = os.environ["OPENAI_API_KEY"]
QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
PG_URL     = os.environ.get("PG_URL", "")
PORT       = int(os.environ.get("PORT", "8001"))
COLLECTION = "lumina_codebase"

oai    = OpenAI(api_key=OPENAI_KEY)
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
app    = FastAPI(title="Lumina Triage Agent", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class Ticket(BaseModel):
    title: str
    description: str
    reported_by: str = "system"
    model: str = DEFAULT_MODEL
    api_key: str = ""

class TriageResult(BaseModel):
    ticket_id: str
    severity: str
    category: str
    auto_resolvable: bool
    resolution: str | None
    estimated_fix_minutes: int
    reasoning: str
    created_at: str

LUMINA_PATTERNS = {
    "openai|api key|401|unauthorized": {
        "severity": "P1", "category": "agent_failure",
        "resolution": "OPENAI_API_KEY is invalid or expired. Rotate at platform.openai.com, update .env, restart lumina-app container.",
        "fix_mins": 10,
    },
    "stream|streaming|toUIMessageStream": {
        "severity": "P2", "category": "agent_failure",
        "resolution": "Streaming failure in DataProductFactory.tsx. Check /api/data-product-agent route is responding. Restart lumina-app.",
        "fix_mins": 20,
    },
    "pnpm|lockfile|frozen": {
        "severity": "P3", "category": "build_failure",
        "resolution": "Run: corepack enable && pnpm install --frozen-lockfile. Never use npm install with this repo.",
        "fix_mins": 10,
    },
    "tailwind|css|style": {
        "severity": "P4", "category": "ui_bug",
        "resolution": "Hard-refresh browser. Check postcss.config.mjs has @tailwindcss/postcss plugin.",
        "fix_mins": 15,
    },
    "agent|step|factory": {
        "severity": "P2", "category": "agent_failure",
        "resolution": "Check the 11-step agent pipeline in route.ts. Verify agentId matches AGENT_SYSTEM_PROMPTS keys.",
        "fix_mins": 30,
    },
}

def _pg_connect(dsn: str):
    """pg8000 (pure-Python, no compiled extension) doesn't accept a DSN
    string directly like psycopg2 did — parse the standard
    postgresql://user:pass@host:port/dbname string into kwargs instead."""
    u = urlparse(dsn)
    return pg8000.dbapi.connect(
        user=u.username,
        password=u.password,
        host=u.hostname,
        port=u.port or 5432,
        database=(u.path or "/").lstrip("/"),
        ssl_context=True if "sslmode=require" in (u.query or "") or "sslmode=require" in dsn else None,
    )

def qdrant_search(query_vector, top_k=4):
    try:
        results = qdrant.query_points(
            collection_name=COLLECTION, query=query_vector, limit=top_k
        )
        return results.points
    except AttributeError:
        return qdrant.search(
            collection_name=COLLECTION, query_vector=query_vector, limit=top_k
        )

def match_pattern(text):
    import re
    t = text.lower()
    for pattern, data in LUMINA_PATTERNS.items():
        if re.search(pattern, t):
            return data
    return None

SYSTEM_PROMPT = """You are a senior support engineer.
Analyse the provided codebase context and the ticket details to triage the incident.
Respond ONLY with a valid JSON:
{"severity":"P1|P2|P3|P4","category":"agent_failure|ui_bug|build_failure|perf|other",
"auto_resolvable":true|false,"resolution":"specific fix steps based on the codebase context, or null if unknown","estimated_fix_minutes":30,"reasoning":"brief"}
P1=critical outage (core features down), P2=major feature broken, P3=minor issue, P4=cosmetic/low priority"""

async def run_triage(ticket: Ticket) -> TriageResult:
    ticket_id = str(uuid.uuid4())[:8]
    query     = f"{ticket.title} {ticket.description}"
    matched   = match_pattern(query)

    context = ""
    try:
        emb  = embed(query)
        hits = qdrant_search(emb)
        context = "\n---\n".join(
            f"[{h.payload.get('file','?')}]\n{h.payload.get('text','')[:300]}" for h in hits
        )
    except Exception as e:
        context = f"[RAG unavailable: {e}]"

    try:
        raw = complete_json(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Ticket: {ticket.title}\n{ticket.description}\n\nContext:\n{context}"},
            ],
            model=ticket.model, api_key=ticket.api_key or None,
            temperature=0.1,
        )
    except Exception as e:
        print(f"[triage] LLM error: {e}")
        raw = {"severity":"P3","category":"other","auto_resolvable":False,"resolution":f"LLM error ({ticket.model}): {e}","estimated_fix_minutes":60,"reasoning":"LLM call failed"}

    if matched and (ticket.reported_by == "auto-monitor" or not raw.get("resolution")):
        raw.update({
            "severity": matched["severity"],
            "category": matched["category"],
            "auto_resolvable": True,
            "resolution": matched["resolution"],
            "estimated_fix_minutes": matched["fix_mins"],
        })

    result = TriageResult(
        ticket_id=ticket_id,
        severity=raw.get("severity", "P3"),
        category=raw.get("category", "other"),
        auto_resolvable=raw.get("auto_resolvable", False),
        resolution=raw.get("resolution"),
        estimated_fix_minutes=raw.get("estimated_fix_minutes", 60),
        reasoning=raw.get("reasoning", ""),
        created_at=datetime.datetime.utcnow().isoformat(),
    )

    if PG_URL:
        try:
            conn = _pg_connect(PG_URL)
            cur  = conn.cursor()
            cur.execute(
                "INSERT INTO triage_results (ticket_id,title,severity,category,auto_resolvable,resolution,reasoning,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (result.ticket_id, ticket.title, result.severity, result.category,
                 result.auto_resolvable, result.resolution, result.reasoning, result.created_at)
            )
            conn.commit(); cur.close(); conn.close()
        except Exception as e:
            print(f"[triage] PG write error: {e}")

    return result

@app.get("/health")
def health():
    return {"status": "ok", "service": "lumina-triage-agent"}

@app.post("/triage", response_model=TriageResult)
async def triage(ticket: Ticket):
    return await run_triage(ticket)

@app.post("/demo/inject-p1")
async def inject_p1():
    return await run_triage(Ticket(
        title="ALL AI agents returning 500 — Data Factory completely down",
        description="Every agent step returns HTTP 500. Console: OpenAI API error 401 Unauthorized. Marketing team cannot create any data products. Live demo in 2 hours.",
        reported_by="auto-monitor"
    ))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
