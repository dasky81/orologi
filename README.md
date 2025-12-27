# Orologi.news — Multi‑page static + Vercel Functions + Gemini

Repo pronto per GitHub + Vercel.

## Include
- Frontend multi‑pagina (responsive) con menu + footer coerenti
- Concierge in modal (chat) con upload foto
- Endpoint serverless: **POST /api/analyze** (Gemini) — chiave server-side
- URL puliti via **rewrites** in `vercel.json`

## Variabili ambiente (Vercel)
- `GEMINI_API_KEY` (obbligatoria)
- `GEMINI_MODEL` (opzionale) default: `gemini-2.5-flash`

## Deploy (high level)
1) Push su GitHub  
2) Import su Vercel  
3) Imposta `GEMINI_API_KEY`  
4) Deploy
