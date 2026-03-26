# Aegis Proxy — Zero-Trust Gateway for Autonomous AI Agents

Aegis is a security gateway that intercepts outgoing requests from autonomous AI agents (LangChain, AutoGPT, custom LLM scripts, etc.) and enforces human-in-the-loop authorization for destructive operations. Safe actions pass through instantly. Destructive actions are suspended in-memory until a human SOC analyst approves or denies them through a real-time dashboard.

---

## What It Does

1. An AI agent sends an action payload to the gateway (`POST /proxy/execute`)
2. The **Policy Engine** classifies the intent as `SAFE` or `DESTRUCTIVE`
   - Uses an LLM (OpenAI GPT-4o-mini, Anthropic Claude, or local OpenClaw) when available
   - Falls back to a static keyword heuristic when no LLM API key is configured
3. `SAFE` → payload is instantly allowed through (HTTP 200)
4. `DESTRUCTIVE` → the agent's HTTP connection is **suspended** (socket held open in RAM). The request appears on the SOC Dashboard
5. A human analyst reviews the forensic dossier and clicks **Approve** or **Deny**
6. On approval, the gateway acquires an Auth0 M2M vault token and releases the suspended socket with the token attached
7. On denial, the agent receives HTTP 403

---

## Architecture

```
┌──────────────┐        ┌─────────────────────────┐        ┌───────────────────┐
│   AI Agent   │──POST──▶  apps/proxy (Node.js)   │◀──SSE──│  apps/dashboard   │
│  (Python/JS) │        │  :3001                   │        │  (Next.js) :3000  │
└──────────────┘        │                          │        └───────────────────┘
                        │  ┌────────────────────┐  │                  │
                        │  │ Policy Engine       │  │                  │
                        │  │ (LLM + heuristic)  │  │          Auth0 Login
                        │  └────────────────────┘  │          (Universal)
                        │  ┌────────────────────┐  │                  │
                        │  │ In-Memory Queue     │  │          ┌──────▼──────┐
                        │  │ (TTL: 5 min)       │  │          │   Auth0     │
                        │  └────────────────────┘  │          │   Tenant    │
                        │  ┌────────────────────┐  │          └─────────────┘
                        │  │ Auth0 JWT + RBAC   │  │
                        │  │ M2M Token Cache    │  │
                        │  └────────────────────┘  │
                        └─────────────────────────┘
```

---

## Repository Structure

```
aegis-monorepo/
├── apps/
│   ├── proxy/                    # Node.js backend gateway
│   │   ├── server.js             # Express app, routes, SSE, graceful shutdown
│   │   ├── policyEngine.js       # LLM classification + keyword fallback
│   │   ├── queueManager.js       # In-memory queue with TTL + EventEmitter (SSE)
│   │   ├── authMiddleware.js     # Auth0 JWT verification + RBAC
│   │   ├── tokenCache.js         # M2M token caching with TTL
│   │   ├── auditLog.js           # Persistent JSONL audit trail for decisions
│   │   ├── logger.js             # Pino structured logging (pretty in dev, JSON in prod)
│   │   └── tests/                # Jest test suite (14 tests)
│   │       ├── policy_engine.test.js
│   │       └── routes.test.js
│   └── dashboard/                # Next.js SOC analyst UI
│       └── src/
│           ├── app/
│           │   ├── page.tsx              # Main dashboard (modular component composition)
│           │   ├── layout.tsx            # Root layout with Auth0 provider
│           │   └── api/proxy/             # Server-side API proxy to backend + SSE stream
│           ├── components/soc/           # ForensicCard, SOCHeader, AgentSimulator, ConfirmModal, AuditLog, Toast
│           ├── hooks/                    # useQueuePolling (SSE + fallback), useAuthProfile
│           └── lib/                      # Auth0 client, utilities
├── scripts/
│   ├── simulator/                # Python agent simulator
│   │   ├── autonomous_client.py  # Sends safe + destructive payloads
│   │   └── requirements.txt
│   └── pipelines/                # CI/CD pipeline scripts
├── docs/                         # Documentation (hackathon notes, reviews)
├── docker-compose.yml            # Local multi-service orchestration
├── package.json                  # NPM workspaces root
└── .gitignore
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20, Express 5, Zod, Pino |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| **Auth** | Auth0 (Universal Login + M2M Client Credentials), jose (JWT verification) |
| **LLM** | OpenAI GPT-4o-mini, Anthropic Claude 3 Haiku, or local OpenClaw |
| **Testing** | Jest 30, Supertest, Babel (ESM→CJS transform for jose) |
| **Infra** | Docker Compose, NPM Workspaces |

---

## API Endpoints (Backend — `apps/proxy`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/proxy/execute` | None (rate-limited) | Main gateway. Accepts agent payloads, classifies intent, allows or suspends |
| `GET` | `/queue` | JWT + `view:queue` | Returns all pending requests for the SOC dashboard |
| `GET` | `/queue/events` | JWT + `view:queue` | SSE stream — real-time push on queue add/approve/deny |
| `POST` | `/queue/approve/:id` | JWT + `approve:requests` | Approves a suspended request, acquires M2M vault token |
| `POST` | `/queue/deny/:id` | JWT + `deny:requests` | Denies a suspended request, returns 403 to the agent |
| `POST` | `/external/execute` | JWT (vault token) | Mock protected API — proves the agent *uses* the vault token |
| `GET` | `/audit` | JWT + `view:queue` | Returns last 50 approve/deny decisions from persistent audit log |
| `GET` | `/health` | None | Health check with uptime and queue size |

**Rate limiting**: `/proxy/execute` is limited to 100 requests per IP per minute.

**Payload validation**: All payloads must include an `action` field (enforced via Zod schema).

---

## Authentication & Authorization

The system uses a dual-layer Auth0 integration:

1. **Dashboard → Backend (User auth)**: The Next.js dashboard authenticates users via Auth0 Universal Login. A server-side API proxy route (`/api/proxy/[...path]`) extracts the user's `idToken` from the Auth0 session and forwards it to the backend as a `Bearer` token.

2. **Backend → Auth0 (M2M auth)**: When a request is approved, the backend uses Client Credentials to acquire an M2M access token from Auth0. This token is cached in-memory with a 5-minute pre-expiry grace period (`tokenCache.js`).

3. **RBAC**: Three permissions are enforced via middleware:
   - `view:queue` — read the pending queue
   - `approve:requests` — approve destructive actions
   - `deny:requests` — deny destructive actions

**Local dev bypass**: When `ADMIN_SECRET` (default: `local_dev_secret`) is sent as the Bearer token, the middleware skips JWT verification. This allows testing without Auth0 configuration.

---

## Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.10 (for the simulator)
- **Auth0 tenant** (optional for local dev; required for production auth)
- **LLM API key** (optional; falls back to keyword heuristics without one)

---

## Environment Variables

### Backend (`apps/proxy/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH0_DOMAIN` | For production auth | Your Auth0 tenant domain (e.g. `dev-xxx.us.auth0.com`) |
| `AUTH0_CLIENT_ID` | For M2M tokens | Auth0 application Client ID |
| `AUTH0_CLIENT_SECRET` | For M2M tokens | Auth0 application Client Secret |
| `OPENAI_API_KEY` | No | Enables GPT-4o-mini policy evaluation |
| `ANTHROPIC_API_KEY` | No | Alternative: enables Claude 3 Haiku evaluation |
| `OPENCLAW_API_BASE` | No | Alternative: local OpenClaw LLM endpoint |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: `http://localhost:3000`) |
| `PORT` | No | Server port (default: `3001`) |
| `ADMIN_SECRET` | No | Dev bypass token (default: `local_dev_secret`) |

### Frontend (`apps/dashboard/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_BASE_URL` | Yes | Dashboard URL (e.g. `http://localhost:3000`) |
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Yes | Auth0 application Client ID |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 application Client Secret |
| `AUTH0_SECRET` | Yes | A random 32+ char string for session encryption |
| `NEXT_PUBLIC_API_URL` | No | Backend URL (default: `http://localhost:3001`) |

---

## Quick Start

### 1. Install dependencies

```bash
cd /path/to/aegis-monorepo
npm install              # Installs all workspace dependencies
```

### 2. Configure environment

```bash
# Backend
cp apps/proxy/.env.example apps/proxy/.env
# Fill in AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and optionally OPENAI_API_KEY

# Frontend
cp apps/dashboard/.env.example apps/dashboard/.env.local
# Fill in AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL
```

### 3. Start the services

**Terminal 1 — Backend:**
```bash
cd apps/proxy && npm start
# Gateway running on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd apps/dashboard && npm run dev
# Dashboard running on http://localhost:3000
```

### 4. Run the agent simulator

**Terminal 3:**
```bash
cd scripts/simulator
pip install requests
python3 autonomous_client.py
```

The simulator sends two payloads:
- `get_weather` → classified SAFE, allowed instantly
- `delete_database` → classified DESTRUCTIVE, suspended until you approve/deny on the dashboard

On approval, the simulator automatically calls `/external/execute` with the vault token to demonstrate the **complete Token Vault loop** — the agent receives the token *and uses it* to execute the authorized action.

### Alternative: Docker Compose

```bash
docker compose up
# Proxy on :3001, Dashboard on :3000
```

---

## Connecting Your Own Agents

Instead of executing a sensitive action directly, have your agent POST to the Aegis gateway:

```python
import requests

AEGIS_GATEWAY = "http://localhost:3001/proxy/execute"

payload = {
    "agent_id": "my-agent",
    "action": "delete_user_data",
    "target": "user_123",
    "reasoning": "User requested account deletion"
}

# Timeout should be high — the socket will hang until a human approves
response = requests.post(AEGIS_GATEWAY, json=payload, timeout=300)

if response.status_code == 200:
    result = response.json()
    if result["proxy_action"] == "allowed":
        # Safe action, proceed
        pass
    elif result["proxy_action"] == "step_up_approved":
        # Human approved, vault token available
        vault_token = result["auth0_vault_delegation"]
elif response.status_code == 403:
    # Human denied the action
    pass
```

The only requirement is that the payload must contain an `action` field (string).

---

## Testing

```bash
cd apps/proxy && npm test
```

Runs 14 tests across two suites:
- **policy_engine.test.js** (7 tests) — verifies heuristic classification for safe, destructive, empty, nested, and boundary payloads
- **routes.test.js** (7 tests) — integration tests for all HTTP routes including auth, approve/deny flows, and queue access

> **Note**: Tests automatically unset LLM API keys to force deterministic heuristic evaluation. The `jose` ESM library is transpiled via Babel for Jest CJS compatibility.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `401` on every `/queue` poll | Dashboard not authenticated or dev bypass not active | Ensure `ADMIN_SECRET` bypass is in the proxy route, or log in via Auth0 |
| `unauthorized_fallback_lock` as vault token | `AUTH0_DOMAIN` not set or commented out | Uncomment `AUTH0_DOMAIN` in `apps/proxy/.env` and restart |
| Jest fails with `jose` import error | ESM/CJS incompatibility | Ensure `babel.config.js` exists and `transformIgnorePatterns` is set in `package.json` |
| Dashboard shows "Gateway unreachable" | Backend not running | Start the proxy: `cd apps/proxy && npm start` |
| `pino-pretty` not found in production | Missing dev dependency | Install `pino-pretty` or set `NODE_ENV=production` to skip it |

---

## Known Limitations

- **In-memory queue**: Pending requests are stored in RAM. If the backend restarts, all suspended requests are lost. A persistent store (Redis, PostgreSQL) would be needed for production.
- **Single-process**: The backend runs as a single Node.js process. Horizontal scaling would require shared state for the queue.

---

## Auth0 RBAC Setup (Production)

To enable real RBAC in Auth0:

1. Go to **Applications → APIs** → Select your API
2. Enable **"Enable RBAC"** and **"Add Permissions in the Access Token"**
3. Define permissions: `view:queue`, `approve:requests`, `deny:requests`
4. Create a role **"SOC Analyst"** and assign all 3 permissions
5. Assign the role to your user accounts

---

## License

ISC
