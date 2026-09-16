"""
Lumina Code Intelligence Agent — with /overview endpoint
---------------------------------------------------------
Adds:
  GET  /overview   — auto-generate application overview,
                     tech stack, and required skill profile
                     from the indexed codebase + documents
"""
import os, json, datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from qdrant_client import QdrantClient
from llm_client import complete, complete_json, embed, DEFAULT_MODEL

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
PORT       = int(os.environ.get("PORT", "8003"))
COLLECTION = "lumina_codebase"
DOCS_COLL  = "lumina_documents"

NEO4J_URI  = os.environ.get("NEO4J_URI", "")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASS = os.environ.get("NEO4J_PASSWORD", "")

def query_graph_relations(file_name: str, app_id: str) -> str:
    if not NEO4J_URI or not NEO4J_PASS:
        return ""
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
        with driver.session() as s:
            # Find incoming relations (files that depend on this file)
            q_incoming = """
            MATCH (other:File)-[:IMPORTS]->(f:File)
            WHERE f.app_id = $aid AND (f.path ENDS_WITH $fname OR f.path = $fname OR f.name = $fname)
            RETURN other.path AS path LIMIT 25
            """
            inc = s.run(q_incoming, aid=app_id, fname=file_name)
            incoming_files = [r["path"] for r in inc]
            
            # Find outgoing relations (files/libraries this file depends on)
            q_outgoing = """
            MATCH (f:File)-[r:IMPORTS|DEPENDS_ON]->(dep)
            WHERE f.app_id = $aid AND (f.path ENDS_WITH $fname OR f.path = $fname OR f.name = $fname)
            RETURN type(r) AS rel_type, dep.name AS dep_name, getattr(dep, 'path', '') AS dep_path LIMIT 25
            """
            outg = s.run(q_outgoing, aid=app_id, fname=file_name)
            outgoing_deps = []
            for r in outg:
                t = r["rel_type"]
                name = r["dep_name"] or r["dep_path"]
                outgoing_deps.append(f"{t}: {name}")
                
        driver.close()
        
        context = []
        if incoming_files:
            context.append(f"Files importing/depending on {file_name}:\n" + "\n".join(f" - {f}" for f in incoming_files))
        if outgoing_deps:
            context.append(f"Dependencies of {file_name}:\n" + "\n".join(f" - {d}" for d in outgoing_deps))
            
        return "\n\n".join(context)
    except Exception as e:
        print(f"[graph] Failed to query Neo4j relations: {e}")
        return ""

oai    = OpenAI(api_key=OPENAI_KEY)  # kept for embeddings direct use
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
app    = FastAPI(title="Lumina Code Intel Agent", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SYSTEM = """You are an expert on the indexed application codebase.
Answer questions concisely. Always cite the file path when referencing code."""

def qdrant_search(collection, query_vector, top_k=5):
    try:
        results = qdrant.query_points(collection_name=collection, query=query_vector, limit=top_k)
        return results.points
    except AttributeError:
        return qdrant.search(collection_name=collection, query_vector=query_vector, limit=top_k)

def fetch_context(query: str, collection: str = COLLECTION, top_k: int = 6) -> str:
    try:
        hits = qdrant_search(collection, embed(query), top_k)
        return "\n---\n".join(
            f"[{h.payload.get('file','?')} chunk {h.payload.get('chunk_index',0)}]\n{h.payload.get('text','')}"
            for h in hits
        )
    except Exception as e:
        return f"[Search unavailable: {e}]"

class Query(BaseModel):
    question: str
    top_k: int = 15
    model: str = DEFAULT_MODEL
    api_key: str = ""
    app_id: str = ""  # used to verify we are answering from the right app's vectors

class Answer(BaseModel):
    question: str
    answer: str
    sources: list[str]

@app.get("/health")
def health():
    return {"status": "ok", "service": "lumina-codeintel-agent"}

@app.post("/query", response_model=Answer)
def query(req: Query):
    try:
        emb  = embed(req.question)
        hits = qdrant_search(COLLECTION, emb, req.top_k)
    except Exception as e:
        raise HTTPException(500, f"Search error: {e}")

    # Filter by app_id only when hits actually have the tag AND filtering keeps results
    # Never filter if it would leave us with nothing — always prefer some answer over none
    if req.app_id and hits:
        tagged   = [h for h in hits if h.payload.get("app_id","")]
        filtered = [h for h in hits if h.payload.get("app_id","") == req.app_id]
        if filtered:
            # Good: we have hits matching this app — use them
            hits = filtered
        elif tagged:
            # Hits exist but belong to a different app — warn but still answer
            # (user can re-index to fix permanently)
            pass  # use all hits, add caveat to answer below
        # else: no tags at all (pre-tag index) — use all hits as-is

    if not hits:
        # Truly empty collection — guide user to re-index
        return Answer(question=req.question,
                      answer=(
                          "The codebase index appears to be empty for this application. "
                          "Please go to **Switch Application** in the sidebar and re-index the repository. "
                          "This usually happens after a full Docker restart with `docker compose down -v`."
                      ),
                      sources=[])

    context = "\n---\n".join(
        f"[{h.payload.get('file','?')} chunk {h.payload.get('chunk_index',0)}]\n{h.payload.get('text','')}"
        for h in hits
    )
    sources = list({h.payload.get('file','?') for h in hits})

    # GraphRAG: Find referenced files in user question and inject dependency context
    import re
    file_matches = re.findall(r'([a-zA-Z0-9_\-\/]+\.(?:java|tsx|ts|js|jsx|py|cs|go|cpp|h|xml))', req.question)
    graph_context = ""
    if file_matches and req.app_id:
        for fname in file_matches:
            base_name = fname.split("/")[-1]
            relations = query_graph_relations(base_name, req.app_id)
            if relations:
                graph_context += f"\n=== Dependency Graph for {fname} ===\n{relations}\n"
    if graph_context:
        context = graph_context + "\n\n=== Codebase Excerpts ===\n" + context

    # Build a grounded system prompt that names the actual application
    app_name = req.app_id.replace("_"," ").title() if req.app_id else "the indexed application"
    system = (
        f"You are a senior software architect and an expert on the {app_name} codebase. "
        "Analyze the codebase context and answer the user's questions to accelerate knowledge transition. "
        "Provide a comprehensive, detailed, and expert response. Synthesize the provided context to answer the question as completely as possible. "
        "Make sure to reference and explain the dependency graph and relationships/impact of changing files if provided in the context. "
        "If some information is not directly found in the context but can be inferred from the structure, dependencies, or standard patterns (e.g., standard libraries/frameworks used), provide the logical inference clearly marked as such. "
        "Always cite the actual file path when referencing code."
    )

    try:
        answer = complete(
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": f"Codebase context:\n{context}\n\nQuestion: {req.question}"},
            ],
            model=req.model, api_key=req.api_key or None,
            max_tokens=800, temperature=0.1,
        )
    except Exception as e:
        raise HTTPException(500, f"LLM error ({req.model}): {e}")
    return Answer(question=req.question, answer=answer, sources=sources)

# ── /overview — the new endpoint ──────────────────────────────
OVERVIEW_QUERIES = [
    ("application purpose business domain", COLLECTION),
    ("technology stack framework dependencies", COLLECTION),
    ("package.json next config dependencies version", COLLECTION),
    ("data sources integrations external APIs", COLLECTION),
    ("architecture components structure", COLLECTION),
    ("functional specification business requirements", DOCS_COLL),
]

OVERVIEW_SYSTEM = """You are a senior technical analyst preparing an application overview for an incoming support team.

Analyse the provided codebase and document excerpts and produce a structured JSON response:
{
  "application_name": "short name",
  "application_summary": "2-3 sentences: what this application does and who uses it",
  "business_domain": "e.g. Marketing Analytics, ERP, Customer Portal",
  "tech_stack": {
    "frontend": ["framework, version"],
    "backend": ["framework, version"],
    "ai_ml": ["model, library"],
    "database": ["name, purpose"],
    "infrastructure": ["Docker, cloud, CI/CD"],
    "key_dependencies": ["important libraries"]
  },
  "architecture_highlights": ["3-5 key architectural points"],
  "data_sources": ["list of data systems the app connects to"],
  "integrations": ["external APIs or services"],
  "complexity_rating": "Low / Medium / High / Very High",
  "complexity_reason": "why this rating",
  "required_skills": [
    {
      "role": "role title",
      "level": "Junior / Mid / Senior",
      "skills": ["skill1", "skill2"],
      "fte": "0.5 / 1 / 2",
      "reason": "why this role is needed"
    }
  ],
  "support_risks": ["top 3-4 risks for the incoming team"],
  "onboarding_priority": ["top 3 things the new team must learn first"]
}

Be specific to what you actually see in the code. Do not invent capabilities not visible in the context."""

@app.get("/overview")
def get_overview(app_id: str = ""):
    """
    Auto-generate an application overview, tech stack, and required skill profile
    from the indexed codebase and uploaded documents.
    """
    # Gather context from multiple targeted queries
    context_parts = []
    for query_text, coll in OVERVIEW_QUERIES:
        try:
            emb  = embed(query_text)
            hits = qdrant_search(coll, emb, top_k=4)
            # Filter by app_id to avoid cross-app contamination
            if app_id:
                hits = [h for h in hits if h.payload.get("app_id","") == app_id] or hits
            ctx = "\n---\n".join(
                f"[{h.payload.get('file','?')}]\n{h.payload.get('text','')}" for h in hits
            )
            if ctx.strip():
                context_parts.append(ctx)
        except Exception:
            pass

    if not context_parts:
        # Return a rich mock if nothing is indexed
        return _mock_overview(app_id)

    combined_context = "\n\n===\n\n".join(context_parts[:5])

    try:
        result = complete_json(
            messages=[
                {"role": "system", "content": OVERVIEW_SYSTEM},
                {"role": "user",   "content": f"Codebase and document excerpts:\n{combined_context}\n\nGenerate the application overview JSON now."},
            ],
            max_tokens=2000, temperature=0.1,
        )
        result["generated_at"] = datetime.datetime.utcnow().isoformat()
        result["source"] = "live_analysis"
        return result
    except Exception as e:
        print(f"[overview] Error: {e}")
        return _mock_overview(app_id)

def _mock_overview(app_id: str = "") -> dict:
    app_name = app_id.replace("_", " ").replace("-", " ").title() if app_id else "Lumina Marketing Analytics Data Factory"
    if app_id and app_id != "lumina":
        return {
            "source": "mock",
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "application_name": app_name,
            "application_summary": f"This is a placeholder overview for the '{app_name}' application. The codebase vectors have not been successfully loaded or the collection is currently empty. Please trigger indexing or verify the collection contains active points.",
            "business_domain": "System Analysis",
            "tech_stack": {
                "frontend": ["Under Analysis"],
                "backend": ["Under Analysis"],
                "ai_ml": ["N/A"],
                "database": ["Under Analysis"],
                "infrastructure": ["N/A"],
                "key_dependencies": []
            },
            "architecture_highlights": [
                "Index state is currently empty or has not finished parsing",
                "Once indexed, technical debt analysis and skills profiles will populate here"
            ],
            "data_sources": ["Under Analysis"],
            "integrations": ["Under Analysis"],
            "complexity_rating": "Medium",
            "complexity_reason": "No codebase files analyzed yet.",
            "required_skills": [
                {"role": "System Analyst", "level": "Mid", "skills": ["Code analysis"], "fte": "1.0", "reason": "Required to analyze the system files."}
            ],
            "support_risks": ["System documentation is missing or has not been parsed."],
            "onboarding_priority": ["Verify repository configuration and trigger codebase indexing."]
        }
    return {
        "source": "mock",
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "application_name": "Lumina Marketing Analytics Data Factory",
        "application_summary": "Lumina is an AI-powered marketing analytics platform built for JLR (Jaguar Land Rover) that enables data product creation through an 11-step agentic pipeline. It allows marketing analysts to define, build, validate, and publish data products backed by CRM, campaign, digital, and sales data. The platform incorporates OpenAI-powered agents at every step with human-in-the-loop approval gates.",
        "business_domain": "Automotive Marketing Analytics",
        "tech_stack": {
            "frontend": ["Next.js 16.1.6", "React 19.2.4", "TypeScript 5.7.3", "Tailwind CSS v4"],
            "backend": ["Next.js App Router (API routes)", "Vercel AI SDK v6"],
            "ai_ml": ["OpenAI gpt-4o-mini (11 agents)", "text-embedding-3-small", "RAG pipeline"],
            "database": ["No persistent DB — all state in React (client-side only)"],
            "infrastructure": ["Docker (containerised)", "pnpm package manager", "Node.js 20"],
            "key_dependencies": ["recharts (data viz)", "framer-motion (animations)", "radix-ui (components)", "zod (validation)", "lucide-react (icons)"]
        },
        "architecture_highlights": [
            "Single Next.js App Router application — no separate backend service",
            "11 AI agents all routed through one API endpoint (/api/data-product-agent/route.ts)",
            "Agent outputs stream via Vercel AI SDK streamText() with no retry or fallback",
            "All application state is client-side React — no database, no persistence between sessions",
            "Data catalog (13 sources) is static mock data defined in lib/data-product-types.ts"
        ],
        "data_sources": [
            "CRM Customers (Salesforce)", "Website Events (Adobe Analytics)", "Email Campaign Clicks (Adobe Campaign)",
            "Campaign Responses", "Vehicle Orders", "Dealer Network",
            "Customer Preferences", "Customer Segments (Experian)", "Campaign Master",
            "Configurator Sessions", "Test Drive Bookings", "Vehicle Service History",
            "Finance Contracts (JLR Financial Services)"
        ],
        "integrations": ["OpenAI API (gpt-4o-mini, text-embedding-3-small)", "Vercel Analytics"],
        "complexity_rating": "High",
        "complexity_reason": "11 interdependent AI agents with streaming responses, complex state management across a multi-step pipeline, JLR-specific domain knowledge embedded in prompts, and no test coverage make this a high-complexity application to support.",
        "required_skills": [
            {"role":"AI / LLM Engineer","level":"Senior","skills":["OpenAI API","Vercel AI SDK","prompt engineering","streaming LLM responses","RAG pipelines"],"fte":"1","reason":"Core AI pipeline (11 agents) requires deep LLM expertise. Rate limiting, retry logic, and JSON schema validation are unresolved debt."},
            {"role":"Next.js Frontend Engineer","level":"Mid–Senior","skills":["Next.js 14+","React 18+","TypeScript","Tailwind CSS","Framer Motion","Recharts"],"fte":"1","reason":"Complex UI with animated dashboards, multi-step factory stepper, and data visualisation. No test coverage adds risk."},
            {"role":"DevOps / Platform Engineer","level":"Mid","skills":["Docker","pnpm","Node.js","CI/CD pipelines","environment management"],"fte":"0.5","reason":"Container orchestration, environment variable management, and CI pipeline maintenance (pnpm-specific)."},
            {"role":"Data / Domain Analyst","level":"Mid","skills":["JLR marketing domain","CRM data","SQL","data catalog management"],"fte":"0.5","reason":"Agent prompts are JLR-specific. A domain analyst is needed to validate and update prompts as business requirements change."},
        ],
        "support_risks": [
            "No automated tests — every change carries regression risk with no safety net",
            "OpenAI rate limiting has caused 3 production incidents; no permanent fix implemented",
            "All agent knowledge is JLR-specific — transferring to a new domain requires significant prompt re-engineering",
            "Client-side-only state means any browser refresh loses all factory progress"
        ],
        "onboarding_priority": [
            "Understand the 11-agent pipeline sequence and the AGENT_SYSTEM_PROMPTS constant in route.ts",
            "Learn the JLR data catalog structure (13 sources in lib/data-product-types.ts)",
            "Set up local dev environment with pnpm (not npm) and a valid OPENAI_API_KEY"
        ]
    }


@app.get("/debug")
def debug():
    """Check what is actually in the Qdrant collection."""
    try:
        info = qdrant.get_collection(COLLECTION)
        count = info.points_count
        # Sample a few points to see what app_ids are present
        sample = qdrant.scroll(collection_name=COLLECTION, limit=5, with_payload=True, with_vectors=False)
        if isinstance(sample, tuple):
            pts = sample[0]
        else:
            pts = sample.points
        app_ids = list({p.payload.get("app_id","<no tag>") for p in pts})
        files   = list({p.payload.get("file","?") for p in pts})[:5]
        return {
            "collection": COLLECTION,
            "total_vectors": count,
            "app_ids_in_sample": app_ids,
            "sample_files": files,
            "status": "ok" if count > 0 else "empty",
        }
    except Exception as e:
        return {"collection": COLLECTION, "status": "error", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
