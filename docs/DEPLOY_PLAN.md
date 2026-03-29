# Midosoc — GCP Cloud Run Deployment Plan

**Date:** March 29, 2026  
**Target:** Deploy both services to Google Cloud Run in dev mode (no Auth0 login, Token Vault still active)

---

## Architecture (Deployed)

```
Judge's Browser
      │
      ▼
┌───────────────────────────────┐
│  midosoc-dashboard (Cloud Run)  │
│  Next.js 16 — port 3000      │
│  https://midosoc-dashboard-xxx  │
│  .run.app                     │
│                               │
│  SKIP_AUTH=true (no login)    │
│  Passes ADMIN_SECRET to proxy │
└──────────────┬────────────────┘
               │ API proxy /api/proxy/*
               │ SSE proxy /api/proxy/queue/events
               ▼
┌───────────────────────────────┐         ┌────────────────┐
│  midosoc (Cloud Run)      │         │                │
│  Express 5 — port 3001        │────────▶│  Auth0 Tenant  │
│  https://midosoc-xxx      │  M2M    │  Token Vault   │
│  .run.app                     │◀────────│  (on approve)  │
│                               │         │                │
│  min-instances=1 (keeps queue)│         └────────────────┘
│  ALLOWED_ORIGINS=dashboard URL│
└───────────────────────────────┘
```

**Judge experience:** Open dashboard URL → no login → AgentSimulator panel → Send Payload → Approve/Deny → done.

---

## Implementation Checklist

### Phase 1: Code Changes (7 items)

#### 1. Remove Windows-only native binaries from dashboard

**File:** `apps/dashboard/package.json`  
**Why:** `@tailwindcss/oxide-win32-x64-msvc` and `lightningcss-win32-x64-msvc` crash on Linux containers (Cloud Run uses Linux).  
**Action:** Remove both from `dependencies`.

---

#### 2. Skip Auth0 middleware when SKIP_AUTH=true

**File:** `apps/dashboard/src/proxy.ts`  
**Why:** Without Auth0 env vars, the middleware breaks all routes.  
**Action:** Return `NextResponse.next()` when `process.env.SKIP_AUTH === 'true'`.

---

#### 3. Skip login redirect when NEXT_PUBLIC_SKIP_AUTH=true

**File:** `apps/dashboard/src/hooks/useAuthProfile.ts`  
**Why:** Without Auth0, `ensureLoggedIn()` redirects to `/auth/login` which doesn't exist, blocking approve/deny.  
**Action:** When `NEXT_PUBLIC_SKIP_AUTH === 'true'`, return a mock user and `ensureLoggedIn()` always returns `true`.

---

#### 4. Use ADMIN_SECRET in API proxy when SKIP_AUTH=true

**File:** `apps/dashboard/src/app/api/proxy/[...path]/route.ts`  
**Why:** `next build` sets `NODE_ENV=production`, which currently tries to read Auth0 session. In SKIP_AUTH mode, we want ADMIN_SECRET regardless of NODE_ENV.  
**Action:** Check `process.env.SKIP_AUTH === 'true'` before NODE_ENV check. If true, use ADMIN_SECRET.

---

#### 5. Same for SSE proxy

**File:** `apps/dashboard/src/app/api/proxy/queue/events/route.ts`  
**Why:** Same issue — SSE proxy needs ADMIN_SECRET in SKIP_AUTH mode.  
**Action:** Same pattern as item 4.

---

#### 6. Fix next.config.ts turbopack root

**File:** `apps/dashboard/next.config.ts`  
**Why:** `root: path.resolve(__dirname, "../..")` references the monorepo root. In a Docker container built from `apps/dashboard/`, this path doesn't exist.  
**Action:** Remove the turbopack root override, or wrap it in a conditional.

---

#### 7. Add audit data to .gitignore

**File:** `.gitignore` (root)  
**Why:** Don't commit `apps/proxy/data/audit.jsonl` to the repo.  
**Action:** Add `apps/proxy/data/` to `.gitignore`.

---

### Phase 2: Dockerfiles (2 files)

#### 8. Proxy Dockerfile

**File:** `apps/proxy/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

RUN mkdir -p data

EXPOSE 3001
CMD ["node", "server.js"]
```

---

#### 9. Dashboard Dockerfile

**File:** `apps/dashboard/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

> Requires adding `output: "standalone"` to `next.config.ts` for the optimized production build.

---

#### 10. Add standalone output to next.config.ts

**File:** `apps/dashboard/next.config.ts`  
**Why:** Next.js standalone output creates a self-contained `server.js` — ideal for Docker.  
**Action:** Add `output: "standalone"` to the config.

---

### Phase 3: Deploy to Cloud Run (5 steps)

#### 11. Deploy proxy

```bash
cd apps/proxy

gcloud run deploy midosoc \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port=3001 \
  --set-env-vars="ADMIN_SECRET=<secret>,NODE_ENV=production,AUTH0_DOMAIN=<domain>,AUTH0_CLIENT_ID=<m2m-client-id>,AUTH0_CLIENT_SECRET=<m2m-client-secret>,AUTH0_AUDIENCE=<audience>"
```

> Note: `ALLOWED_ORIGINS` will be set after dashboard deploys (chicken-and-egg).

---

#### 12. Deploy dashboard

```bash
cd apps/dashboard

gcloud run deploy midosoc-dashboard \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port=3000 \
  --set-env-vars="NEXT_PUBLIC_API_URL=https://midosoc-<hash>-uc.a.run.app,ADMIN_SECRET=<same-secret>,SKIP_AUTH=true,NEXT_PUBLIC_SKIP_AUTH=true"
```

---

#### 13. Update proxy CORS with dashboard URL

```bash
gcloud run services update midosoc \
  --region us-central1 \
  --update-env-vars="ALLOWED_ORIGINS=https://midosoc-dashboard-<hash>-uc.a.run.app"
```

---

#### 14. Smoke test

1. Open `https://midosoc-dashboard-<hash>-uc.a.run.app` — should show SOC Command Center
2. Click "Send Payload" in AgentSimulator — forensic card should appear
3. Click Approve → modal → confirm → toast success
4. Check audit log panel updates

---

#### 15. Update submission with URLs

- **Published link:** `https://midosoc-dashboard-<hash>-uc.a.run.app`
- **Proxy endpoint (for README):** `https://midosoc-<hash>-uc.a.run.app`

---

## Environment Variables Reference

### Proxy (Cloud Run)

| Variable | Value |
|---|---|
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `ADMIN_SECRET` | `<pick a strong random string>` |
| `ALLOWED_ORIGINS` | `https://midosoc-dashboard-<hash>-uc.a.run.app` |
| `AUTH0_DOMAIN` | `<your Auth0 tenant, e.g. dev-xxx.us.auth0.com>` |
| `AUTH0_CLIENT_ID` | `<M2M application Client ID>` |
| `AUTH0_CLIENT_SECRET` | `<M2M application Client Secret>` |
| `AUTH0_AUDIENCE` | `<M2M audience>` |

### Dashboard (Cloud Run)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://midosoc-<hash>-uc.a.run.app` |
| `ADMIN_SECRET` | `<same value as proxy>` |
| `SKIP_AUTH` | `true` |
| `NEXT_PUBLIC_SKIP_AUTH` | `true` |

---

## Important Notes

- **Both services scale to zero when idle ($0 cost).** The in-memory queue is lost on scale-to-zero, but judges create fresh requests via the AgentSimulator anyway. First request after cold start takes ~2-3s.
- **SSE works on Cloud Run.** Default request timeout is 300s, matching the queue's 5-minute TTL.
- **Auth0 M2M is still real.** SKIP_AUTH only skips *dashboard login*. The Token Vault flow (M2M token on approve) still hits Auth0 — which is the hackathon requirement.
- **NEXT_PUBLIC_ prefix matters.** Client-side code can only read env vars prefixed with `NEXT_PUBLIC_`. `SKIP_AUTH` is server-side only; `NEXT_PUBLIC_SKIP_AUTH` is for the React hook.
- **AgentSimulator posts directly to the proxy.** This is the main way judges trigger requests. It uses `NEXT_PUBLIC_API_URL` — which must be the proxy's Cloud Run URL with CORS allowing the dashboard origin.

---

## Execution Order

```
1. Code changes (items 1–7)        ← implement first, test locally
2. Dockerfiles + config (items 8–10) ← create files
3. Test locally with Docker          ← docker build + run both
4. Deploy proxy (item 11)            ← get proxy URL
5. Deploy dashboard (item 12)        ← uses proxy URL
6. Update proxy CORS (item 13)       ← uses dashboard URL
7. Smoke test (item 14)              ← verify end-to-end
8. Record demo video                 ← on the deployed app
9. Submit                            
```
