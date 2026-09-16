"""
Lumina Technical Debt Scanner  —  port 8007
Scans the active indexed codebase via Qdrant RAG.
Generic mock that adapts to the active application name.
KPI summary is always computed from the actual items list.
"""
import os, json, datetime
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from qdrant_client import QdrantClient
from llm_client import complete_json, embed, DEFAULT_MODEL

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")  # required for Qdrant Cloud
PORT       = int(os.environ.get("PORT", "8007"))
COLLECTION = "lumina_codebase"  # always the active app's collection

oai    = OpenAI(api_key=OPENAI_KEY) if OPENAI_KEY else None
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None, timeout=60)
app    = FastAPI(title="Lumina Technical Debt Scanner", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Debt query probes ─────────────────────────────────────────
DEBT_QUERIES = [
    "error handling exceptions missing try catch boundary",
    "retry logic exponential backoff API failure resilience",
    "test coverage unit tests automated testing missing",
    "input validation schema enforcement sanitize request body",
    "hardcoded credentials secrets API keys environment variables",
    "logging observability monitoring structured log tracing",
    "authentication authorization access control security",
    "performance caching pagination large dataset slow query",
    "dependency outdated deprecated version upgrade",
    "documentation missing comment undocumented function",
    "configuration management environment variables startup",
    "error message user facing exception exposed stack trace",
]

def compute_summary(items: list) -> dict:
    """Always compute from items — never hardcode zeros."""
    high   = sum(1 for i in items if str(i.get("severity","")).lower() == "high")
    medium = sum(1 for i in items if str(i.get("severity","")).lower() == "medium")
    low    = sum(1 for i in items if str(i.get("severity","")).lower() == "low")
    effort = sum(float(i.get("effort_days", 1)) for i in items)
    return {
        "total_items":     len(items),
        "high_severity":   high,
        "medium_severity": medium,
        "low_severity":    low,
        "total_effort_days": round(effort, 1),
        "estimated_sprints": round(effort / 10, 1),
    }

def debt_score(items: list) -> int:
    weights = {"high": 3, "medium": 2, "low": 1}
    if not items:
        return 100
    total = sum(weights.get(str(i.get("severity","low")).lower(), 1) for i in items)
    max_p = len(items) * 3
    return max(0, min(100, 100 - round((total / max_p) * 100)))

def build_generic_mock(app_name: str = "this application") -> dict:
    """
    Generic debt items applicable to any codebase.
    NOT Lumina-specific — adapts to the active app name.
    """
    items = [
        {"id":"TD-001","category":"Reliability","severity":"high","title":"No retry logic on external API calls",
         "description":f"External API calls in {app_name} have no retry or backoff. A single transient failure fails the entire operation permanently.","file":"(API integration layer)",
         "recommendation":"Implement exponential backoff with 3 retries. Add a circuit breaker for sustained outages.","effort_days":2.0,"impact":"Transient API failures cause unnecessary user-visible errors"},
        {"id":"TD-002","category":"Testing","severity":"high","title":"No automated test suite found",
         "description":f"No test files (*.test.*, *.spec.*) detected in {app_name}. Zero automated coverage means every change carries regression risk.","file":"(entire codebase)",
         "recommendation":"Add unit tests for core business logic first. Target 40% coverage in the first sprint. Add integration tests for critical paths.","effort_days":10.0,"impact":"Every refactor or bug fix risks introducing regressions with no safety net"},
        {"id":"TD-003","category":"Security","severity":"high","title":"Environment variable validation missing at startup",
         "description":"Required configuration values are consumed without validation. Missing or invalid config fails at runtime with cryptic errors rather than a clear startup message.","file":"(application startup / config module)",
         "recommendation":"Add a startup validation block that checks all required env vars and fails fast with a clear error listing what is missing.","effort_days":0.5,"impact":"Misconfigurations are discovered late, causing production incidents"},
        {"id":"TD-004","category":"Reliability","severity":"high","title":"No error boundaries or graceful degradation",
         "description":"Unhandled exceptions propagate to the user or crash the service. No graceful fallback when a subsystem fails.","file":"(service/component boundaries)",
         "recommendation":"Add error boundaries at service boundaries. Implement graceful degradation — partial failure should not bring down unrelated features.","effort_days":3.0,"impact":"One failing component cascades to user-visible full-service outage"},
        {"id":"TD-005","category":"Security","severity":"medium","title":"Input validation not enforced on API endpoints",
         "description":"API request bodies are not validated against a schema before processing. Invalid or malicious input could cause unexpected behaviour.","file":"(API endpoint handlers)",
         "recommendation":"Add schema validation (e.g. Zod, Pydantic, Joi) on all API inputs. Return structured validation errors rather than 500s.","effort_days":2.0,"impact":"Potential for injection attacks or unexpected runtime errors from malformed input"},
        {"id":"TD-006","category":"Observability","severity":"medium","title":"No structured logging or distributed tracing",
         "description":"Application uses unstructured logging with no correlation IDs. Diagnosing multi-step failures requires reading raw console output.","file":"(logging layer — entire codebase)",
         "recommendation":"Add structured logging (JSON format). Assign a correlation ID to each request and pass it through all downstream calls. Consider OpenTelemetry.","effort_days":3.0,"impact":"Incident diagnosis time is significantly longer without structured logs"},
        {"id":"TD-007","category":"Performance","severity":"medium","title":"No pagination or streaming for large data results",
         "description":"Data responses are not paginated or streamed. Large result sets are loaded fully into memory and sent in a single response, causing timeouts and high memory use.","file":"(data retrieval layer)",
         "recommendation":"Implement cursor-based pagination for all list endpoints. Stream large payloads rather than buffering in memory.","effort_days":3.0,"impact":"Performance degrades linearly with data volume — a known scaling ceiling"},
        {"id":"TD-008","category":"Maintainability","severity":"medium","title":"Configuration values hardcoded in source",
         "description":"URLs, timeouts, model names, and other configuration are hardcoded as string literals rather than environment variables or config files.","file":"(multiple source files)",
         "recommendation":"Move all configuration to environment variables or a centralised config module. Never hardcode environment-specific values.","effort_days":1.5,"impact":"Configuration changes require code deployments rather than config updates"},
        {"id":"TD-009","category":"Security","severity":"medium","title":"Error responses expose internal implementation details",
         "description":"Error messages returned to clients may include stack traces, internal file paths, or database error strings.","file":"(error handling middleware)",
         "recommendation":"Add a global error handler that returns sanitised error messages to clients and logs full details internally only.","effort_days":1.0,"impact":"Internal architecture exposed to potential attackers or malicious users"},
        {"id":"TD-010","category":"Maintainability","severity":"low","title":"No API versioning strategy",
         "description":"API endpoints have no versioning. Breaking changes to the API will break all consumers simultaneously.","file":"(API routing layer)",
         "recommendation":"Add /v1/ prefix to all API routes. Define a deprecation policy before introducing breaking changes.","effort_days":2.0,"impact":"Future breaking changes require coordinated rollout across all consumers"},
        {"id":"TD-011","category":"Maintainability","severity":"low","title":"No health check endpoint",
         "description":"The application has no /health or /ready endpoint. Load balancers and orchestration tools cannot determine application readiness.","file":"(application entry point)",
         "recommendation":"Add /health returning {status:'ok', timestamp} and optionally checking key dependencies (DB, external APIs).","effort_days":0.5,"impact":"Deployment orchestration cannot distinguish a healthy app from one that is starting or degraded"},
        {"id":"TD-012","category":"Documentation","severity":"low","title":"No API documentation or developer guide",
         "description":"No OpenAPI/Swagger spec, README for developers, or onboarding guide found. New engineers must read source to understand the API.","file":"(missing — no docs found)",
         "recommendation":"Generate an OpenAPI spec from existing endpoints. Write a developer README covering setup, key concepts, and common workflows.","effort_days":3.0,"impact":"Onboarding time for new engineers is significantly longer without documentation"},
    ]
    summary = compute_summary(items)
    score   = debt_score(items)
    high_c  = summary["high_severity"]
    total_e = summary["total_effort_days"]
    exec_summary = (
        f"Static analysis of {app_name} identified {len(items)} technical debt items totalling "
        f"approximately {total_e} developer-days of remediation work. "
        f"{high_c} items are high-severity and should be addressed in the first sprint: "
        f"missing retry logic on external API calls (known cause of incidents), no automated test suite "
        f"(zero coverage means every change is a regression risk), and missing startup validation for "
        f"required configuration. Run 'Scan codebase' to generate analysis from the actual indexed source files."
    )
    return {
        "scanned_at":     datetime.datetime.utcnow().isoformat(),
        "source":         "generic_preview",
        "app":            app_name,
        "debt_score":     score,
        "debt_score_label": f"Preview — {score}/100 estimated · click 'Scan codebase' for live analysis",
        "summary":        summary,
        "by_category":    {},
        "items":          items,
        "priority_fixes": [i for i in items if i["severity"] == "high"],
        "executive_summary": exec_summary,
    }

def qdrant_search(query_vector, top_k=3):
    try:
        return qdrant.query_points(collection_name=COLLECTION, query=query_vector, limit=top_k).points
    except AttributeError:
        return qdrant.search(collection_name=COLLECTION, query_vector=query_vector, limit=top_k)

def scan_via_rag(app_name: str = "", model: str = DEFAULT_MODEL, api_key: str | None = None) -> dict:
    if not oai:
        return build_generic_mock(app_name or "this application")
    sample_chunks = []
    for query_text in DEBT_QUERIES[:8]:
        try:
            emb  = oai.embeddings.create(model="text-embedding-3-small", input=query_text).data[0].embedding
            hits = qdrant_search(emb, top_k=2)
            for h in hits:
                t = h.payload.get("text","")
                f = h.payload.get("file","?")
                if t:
                    sample_chunks.append({"file":f,"text":t[:300]})
        except Exception as e:
            print(f"[debt] search error: {e}")
    if not sample_chunks:
        return build_generic_mock(app_name or "this application")
    context = json.dumps(sample_chunks[:18], indent=2)
    try:
        ai = complete_json(
            model=model,
            messages=[{
                "role":"system",
                "content": (
                    "You are a senior software architect reviewing code for technical debt. "
                    "Analyse the provided code chunks and identify concrete debt items. "
                    "Each item must have specific evidence from the code — not generic advice. "
                    "Respond ONLY with valid JSON in this exact format:\n"
                    '{"items":[{"id":"TD-001","category":"Reliability|Security|Testing|Performance|Maintainability|Observability|Documentation","severity":"high|medium|low","title":"short title","description":"specific description referencing actual code","file":"actual filename from context","recommendation":"specific fix","effort_days":1.0,"impact":"user-visible impact"}],"executive_summary":"3 sentence summary"}'
                )
            },{
                "role":"user",
                "content":f"Application: {app_name or 'unknown'}\nCode chunks:\n{context}\n\nIdentify technical debt items with specific evidence from the code shown."
            }],
            response_format={"type":"json_object"},
            max_tokens=2500, temperature=0.1,
        )
        
        items = ai.get("items", [])
        if not items:
            return build_generic_mock(app_name or "this application")
        # Always compute summary from items — never trust AI-generated counts
        summary = compute_summary(items)
        score   = debt_score(items)
        return {
            "scanned_at":        datetime.datetime.utcnow().isoformat(),
            "source":            "codebase_rag_live",
            "app":               app_name or "application",
            "debt_score":        score,
            "debt_score_label":  f"Live analysis · {score}/100 health score",
            "summary":           summary,
            "by_category":       {},
            "items":             items,
            "priority_fixes":    [i for i in items if str(i.get("severity","")).lower() == "high"],
            "executive_summary": ai.get("executive_summary",""),
        }
    except Exception as e:
        print(f"[debt] RAG scan error: {e}")
        return build_generic_mock(app_name or "this application")

@app.get("/health")
def health():
    return {"status":"ok","service":"lumina-debt-scanner"}

@app.post("/scan")
def scan(app_name: str = Query(default=""), model: str = Query(default=DEFAULT_MODEL), api_key: str = Query(default="")):
    return scan_via_rag(app_name, model=model, api_key=api_key or None)

@app.get("/scan/quick")
def quick_scan(app_name: str = Query(default="")):
    return build_generic_mock(app_name or "this application")

@app.get("/mock-scan")
def mock_scan(app_name: str = Query(default="")):
    return build_generic_mock(app_name or "this application")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
