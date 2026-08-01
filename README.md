# AI Chatbot — React + Node + Groq (free)

A chat UI backed by [Groq](https://groq.com)'s free API. Groq runs open models
(Llama, Gemma, etc.) on custom hardware and offers every model for free with
no credit card — you're only limited by rate limits, not billing. The React
client talks to a small Express server, which forwards requests to Groq and
streams the reply back token-by-token.

```
┌───────────┐     /api/chat      ┌───────────┐     /chat/completions   ┌────────┐
│  React    │ ─────────────────► │  Node /   │ ───────────────────────► │ Groq   │
│  (Vite)   │ ◄───────────────── │  Express  │ ◄─────────────────────── │ API    │
└───────────┘   streamed tokens  └───────────┘       streamed SSE       └────────┘
```

Your API key lives only in `server/.env` — it's never sent to the browser.

## Prerequisites

- [Node.js](https://nodejs.org) 18 or later (needed for native `fetch`)
- A free Groq API key: [console.groq.com/keys](https://console.groq.com/keys)
  (sign up with an email, no credit card required)

## 1. Start the backend

```bash
cd server
cp .env.example .env   # then open .env and paste in your GROQ_API_KEY
npm install
npm start
```

The server listens on `http://localhost:3001` and exposes:

- `GET /api/health` — checks that the API key works and Groq is reachable
- `GET /api/models` — lists available chat models (powers the model picker)
- `POST /api/chat` — streams a chat completion from Groq

## 2. Start the frontend

```bash
cd client
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev server proxies
`/api/*` requests to the Node server on port 3001, so both need to be running.

## How it works

- The client keeps the full conversation in React state and sends it with every
  request (the Chat Completions API is stateless — it needs the whole history
  each time).
- The Node server re-shapes Groq's OpenAI-style Server-Sent Events into simple
  newline-delimited JSON and streams that straight through to the browser as
  it's generated, so replies appear incrementally instead of all at once.
- The sidebar polls `/api/health` every 15 seconds so the connection indicator
  stays accurate if your key is missing, invalid, or you're rate-limited.
- "Stop" aborts the in-flight fetch on the client immediately.

## Free tier limits

Groq's free tier (no credit card) currently allows:
- Every model on the platform
- 30 requests per minute
- 14,400 requests per day

That's per organization/account, not per API key. It's comfortably enough for
personal use or a small number of people trying the app. If you outgrow it,
adding a card unlocks higher limits and a discount — no forced upgrade.

## Customizing

- Change the default model in `server/.env` (`DEFAULT_MODEL`), e.g.
  `llama-3.3-70b-versatile` (larger, smarter), `llama-3.1-8b-instant`
  (smaller, faster), or `gemma2-9b-it`.
- The model picker in the sidebar pulls live from Groq's `/models` endpoint,
  so any model your key can access will show up automatically.
- Add generation parameters (temperature, max_tokens, etc.) in the request
  body built in `server/server.js` inside the `/api/chat` route.
- The system prompt lives in `client/src/App.jsx` as `SYSTEM_MESSAGE`.

## Deploying

- **Backend**: deploy `server/` to any Node host (Render, Railway, Fly.io, a
  VPS, etc.) and set `GROQ_API_KEY` as an environment variable there — never
  ship it in the frontend bundle.
- **Frontend**: run `npm run build` in `client/` and host the static `dist/`
  output anywhere (Vercel, Netlify, or served by Express itself). Point it at
  your deployed backend's URL instead of `localhost:3001`.
- Keep in mind the free-tier rate limits apply globally to your account, so a
  publicly deployed app shared with many people can hit them faster than
  local testing would.
