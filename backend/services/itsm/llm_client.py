"""
llm_client.py — shared LLM routing for all Lumina agents
----------------------------------------------------------
Supports:
  - OpenAI  (gpt-4o, gpt-4o-mini, gpt-4-turbo, o1-mini, o1-preview, o3-mini)
  - Gemini  (gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-2.5-pro)

Usage in any agent:
    from llm_client import complete, DEFAULT_MODEL, EMBED_MODEL

    response_text = complete(
        messages=[{"role":"user","content":"Hello"}],
        model="gemini-1.5-pro",        # optional override
        api_key="...",                  # optional per-request key
        max_tokens=800,
        temperature=0.1,
        response_json=False,
    )
"""
import os

# Server-level defaults (from environment)
_OPENAI_KEY   = os.environ.get("OPENAI_API_KEY", "")
_GEMINI_KEY   = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")
EMBED_MODEL   = "text-embedding-3-small"   # always OpenAI for embeddings

# Current as of April 2026 — GPT-5.x family, GPT-4.x family, o-series
# Model IDs must match exactly what OpenAI API accepts.
# gpt-4o-mini is the safest default — works on all paid tiers.
# GPT-5.x models require specific API access. If you get 404/model_not_found,
# switch back to gpt-4o or gpt-4o-mini.
OPENAI_MODELS = {
    # GPT-4o family — widely available, recommended for demos
    "gpt-4o", "gpt-4o-mini",
    # GPT-4.1 family (April 2025+)
    "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
    # GPT-4 classic
    "gpt-4-turbo", "gpt-4",
    # Reasoning / o-series
    "o4-mini", "o3", "o3-mini", "o1", "o1-mini",
    # GPT-5 family — requires GPT-5 API access tier
    "gpt-5", "gpt-5-mini", "gpt-5-nano",
}

# Current as of April 2026 — Gemini 2.5 stable, 3.x preview
# Note: Gemini 1.5 and 2.0 families are deprecated / shutting down June 2026
GEMINI_MODELS = {
    # Gemini 2.5 — stable, recommended for production
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    # Gemini 3.x — preview / latest
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
}

def _is_gemini(model: str) -> bool:
    return model.startswith("gemini")

def _resolve(model, api_key):
    """Return (resolved_model, resolved_key). Falls back to gpt-4o-mini if key missing."""
    m = (model or DEFAULT_MODEL or "gpt-4o-mini").strip()
    if _is_gemini(m):
        k = api_key or _GEMINI_KEY
        if not k:
            raise ValueError(
                f"Gemini model '{m}' selected but no GEMINI_API_KEY configured. "
                "Enter your Gemini API key in the model selector panel."
            )
    else:
        k = api_key or _OPENAI_KEY
        if not k:
            raise ValueError("OPENAI_API_KEY not configured. Check your .env file.")
    return m, k

def complete(
    messages,
    model=None,
    api_key=None,
    max_tokens: int = 1000,
    temperature: float = 0.1,
    response_json: bool = False,
) -> str:
    """
    Unified completion call. Returns the response text string.
    Raises ValueError if credentials are missing.
    """
    m, k = _resolve(model, api_key)

    if _is_gemini(m):
        return _gemini_complete(messages, m, k, max_tokens, temperature)
    else:
        return _openai_complete(messages, m, k, max_tokens, temperature, response_json)

def complete_json(
    messages,
    model=None,
    api_key=None,
    max_tokens: int = 1500,
    temperature: float = 0.1,
) -> dict:
    """Complete and parse JSON response. Strips markdown code fences."""
    import json, re
    text = complete(messages, model=model, api_key=api_key,
                    max_tokens=max_tokens, temperature=temperature, response_json=True)
    # Strip ```json ... ``` fences that some models add
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)

def embed(text, api_key=None):
    """Always uses OpenAI text-embedding-3-small regardless of chat model."""
    from openai import OpenAI
    k = api_key or _OPENAI_KEY
    if not k:
        raise ValueError("OPENAI_API_KEY required for embeddings")
    client = OpenAI(api_key=k)
    return client.embeddings.create(model=EMBED_MODEL, input=text[:8000]).data[0].embedding

def embed_batch(texts, api_key=None):
    from openai import OpenAI
    k = api_key or _OPENAI_KEY
    if not k:
        raise ValueError("OPENAI_API_KEY required for embeddings")
    client = OpenAI(api_key=k)
    result = client.embeddings.create(model=EMBED_MODEL, input=texts).data
    return [r.embedding for r in result]

# ── Provider implementations ──────────────────────────────────

def _openai_complete(messages, model, api_key, max_tokens, temperature, response_json):
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    kwargs = dict(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    # o1/o3 models don't support temperature or system messages
    if model.startswith(("o1", "o3")):
        kwargs.pop("temperature", None)
        kwargs["messages"] = [m for m in messages if m.get("role") != "system"]
    if response_json and not model.startswith(("o1", "o3")):
        kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""

def _gemini_complete(messages, model, api_key, max_tokens, temperature):
    """
    Calls Gemini via the google-genai SDK (google-generativeai).
    Converts OpenAI-style messages to Gemini format.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError(
            "google-generativeai not installed. "
            "Run: pip install google-generativeai"
        )
    genai.configure(api_key=api_key)
    gclient = genai.GenerativeModel(
        model_name=model,
        generation_config=genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
    )
    # Convert messages: merge system into first user turn
    parts = []
    system_prefix = ""
    for msg in messages:
        role = msg.get("role","")
        content = msg.get("content","")
        if role == "system":
            system_prefix = content + "\n\n"
        elif role == "user":
            parts.append(system_prefix + content)
            system_prefix = ""
        elif role == "assistant":
            parts.append(f"[Assistant]: {content}")
    prompt = "\n".join(parts)
    resp = gclient.generate_content(prompt)
    return resp.text or ""

def model_info(model=None):
    m = (model or DEFAULT_MODEL).strip()
    provider = "gemini" if _is_gemini(m) else "openai"
    return {"model": m, "provider": provider, "embed_model": EMBED_MODEL}
