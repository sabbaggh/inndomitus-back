# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
npm install
node app.js
```

No build step. No lint or test scripts are configured.

## Architecture

Single-file Express.js REST API (`app.js`). All logic lives in that one file — no separate modules or subdirectories.

**Endpoints:**
- `POST /api/formulario-contacto` — Contact form; sends an HTML email via Gmail SMTP
- `POST /api/configuracion-agente` — Sets active agent config in Redis, seeds chat history, and sends initial WhatsApp message via Green API
- `POST /api/whatsapp/enviar-mensaje` — Sends an arbitrary WhatsApp message via Green API
- `POST /api/whatsapp/webhook` — Green API webhook; receives incoming WhatsApp messages, runs them through Gemini, and replies; always returns HTTP 200 to suppress retries

**Middleware stack:** CORS (whitelist from env) → JSON body parser → general rate limiter (100 req/15min) → per-endpoint rate limiters (10 req/hr on form/config/send endpoints; webhook is unlimited)

**Email:** Nodemailer over `smtp.gmail.com:587` (STARTTLS). Timestamps use `America/Mexico_City` timezone.

**AI:** Gemini `gemini-2.5-flash` via `@google/generative-ai`. System prompts and initial messages are defined in `SYSTEM_PROMPTS` and `MENSAJES_INICIALES` objects, keyed by `tipoAgente` → `tipoEscenario`. Supported agent types: `cobranza`, `marketing`, `atencion_cliente`, `inndomitus`.

**WhatsApp:** Green API (`api.green-api.com`). Phone numbers are normalized to MX format (`521XXXXXXXXXX@c.us`) by `normalizarNumeroMX()`.

**Redis (Upstash):** Three key namespaces:
- `agent:config` — active agent configuration (overwritten each call to `/api/configuracion-agente`)
- `historial:<chatId>` — last 20 turns of chat history per contact, TTL 24h; history format matches Gemini's `{ role, parts: [{ text }] }` structure
- `procesado:<idMensaje>` — dedup flag, TTL 5min
- `bloqueado:<chatId>` — manual override flag; skips AI response for that number

**Inndomitus special case:** When `tipoAgente === 'inndomitus'` and the chat history is empty and the first message matches a greeting regex, a fixed hardcoded greeting is sent instead of calling Gemini.

## Environment Variables

All required — no defaults except `PORT`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `EMAIL_USER` | Gmail address for SMTP auth |
| `EMAIL_PASSWORD` | Gmail app password |
| `EMAIL_TO` | Recipient for contact form emails |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |
| `GEMINI_API_KEY` | Google Gemini API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `GREENAPI_INSTANCE_ID` | Green API WhatsApp instance ID |
| `GREENAPI_API_TOKEN` | Green API authentication token |
