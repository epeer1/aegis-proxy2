# Midosoc — Implementation Changes & Testing Guide

**Date:** March 26, 2026  
**Scope:** All changes from the VP R&D review sprint

---

## Summary of Changes

### 1. Token Vault Loop Closed (Backend + Simulator)

**What changed:** The flow used to end at "M2M token acquired and returned to agent." Now the agent actually *uses* the token.

**New endpoint:** `POST /external/execute` — a mock protected API that requires a valid vault token (Bearer token). It validates the token and returns a success confirmation.

**Files changed:**
- `apps/proxy/server.js` — added `/external/execute` route
- `scripts/simulator/autonomous_client.py` — after approval, the simulator calls `/external/execute` with the vault token and prints the result

**Full flow after change:**
```
Agent → POST /proxy/execute → [suspended in RAM] → Human approves on dashboard
→ M2M token acquired from Auth0 → Response sent to agent with token
→ Agent calls POST /external/execute with token → "Action authorized and executed"
```

---

### 2. Auth0 Integration Fixed (Dashboard)

**What changed:** The hardcoded `"local_dev_secret"` in the API proxy route is replaced with real Auth0 session extraction. Dev fallback only activates when `NODE_ENV !== 'production'`.

**Files changed:**
- `apps/dashboard/src/app/api/proxy/[...path]/route.ts` — uses `auth0.getSession()` to get a real access token
- `apps/dashboard/src/middleware.ts` — **new file**, wires up Auth0 SDK middleware so `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile` all work
- `apps/dashboard/src/proxy.ts` — fixed to export proper `middleware` function

**Auth routes now available:**
| Route | Purpose |
|-------|---------|
| `/auth/login` | Redirects to Auth0 Universal Login |
| `/auth/logout` | Clears session, redirects to login |
| `/auth/callback` | Auth0 callback handler |
| `/auth/profile` | Returns authenticated user JSON |

---

### 3. SSE Real-Time Updates (Backend + Dashboard)

**What changed:** Dashboard now uses Server-Sent Events for instant updates instead of polling every 1.5s. Falls back to polling if SSE fails.

**New endpoint:** `GET /queue/events` — SSE stream that pushes events when requests are added, approved, or denied. Includes a 15-second heartbeat.

**Files changed:**
- `apps/proxy/queueManager.js` — now extends `EventEmitter`, emits `request:added`, `request:approved`, `request:denied`
- `apps/proxy/server.js` — added `/queue/events` SSE route, broadcasts to all connected clients
- `apps/dashboard/src/hooks/useQueuePolling.ts` — uses `EventSource` for real-time, switches to slow polling (10s) as backup while SSE is connected, fast polling (1.5s) if SSE fails
- `apps/dashboard/src/app/api/proxy/queue/events/route.ts` — **new file**, proxies SSE stream from backend through Next.js

**SSE events:**
```
event: connected
event: request:added      → { id, payload, classification, timestamp }
event: request:approved   → { id }
event: request:denied     → { id }
event: heartbeat
```

---

### 4. UX Polish (Dashboard)

**What changed:**

- **`window.confirm()` replaced with styled modal** — new `ConfirmModal` component matches the SOC dark/red theme. Shows action summary, confidence score, flagged markers, and clear "Confirm Authorize" / "Confirm Reject" buttons.
- **Empty state improved** — now shows "All Clear — No Active Threats" instead of generic "Systems Secure"
- **Threat arrival animation** — new ForensicCards pulse with a red glow animation on arrival (`MIDOSOC-threat-pulse` CSS keyframe)
- **Logout button** — SOCHeader now shows a "Sign Out" link when authenticated

**Files changed:**
- `apps/dashboard/src/components/soc/ConfirmModal.tsx` — **new file**
- `apps/dashboard/src/app/page.tsx` — integrated modal, improved empty state text
- `apps/dashboard/src/components/soc/ForensicCard.tsx` — removed `window.confirm`, added pulse CSS class
- `apps/dashboard/src/components/soc/SOCHeader.tsx` — added logout link
- `apps/dashboard/src/app/globals.css` — added `@keyframes threat-pulse` animation

---

### 5. Persistent Audit Trail (Backend + Dashboard)

**What changed:** Every approve/deny decision is now written to a JSONL file and surfaced in the dashboard.

**New endpoint:** `GET /audit` — returns last 50 decisions (auth-protected, requires `view:queue` permission).

**Audit file location:** `apps/proxy/data/audit.jsonl` (auto-created on first write).

**Each audit entry:**
```json
{
  "timestamp": "2026-03-26T10:30:00.000Z",
  "requestId": "uuid",
  "action": "delete_database",
  "decision": "approved",
  "analyst": "auth0|user_id",
  "riskLevel": "CRITICAL_HEURISTIC_OVERRIDE",
  "confidenceScore": 95
}
```

**Files changed:**
- `apps/proxy/auditLog.js` — **new file**, writes/reads JSONL audit log
- `apps/proxy/server.js` — records decisions on approve/deny, serves `/audit`
- `apps/dashboard/src/components/soc/AuditLog.tsx` — **new file**, collapsible "Decision Log" panel in sidebar

---

### 6. Repo Cleanup

- `apps/proxy/.env.example` — **new file**, template for backend env vars
- `apps/dashboard/.env.example` — **new file**, template for frontend env vars
- `scripts/pipelines/README.md` — **new file**, documents the hackathon pipeline script as a meta-tool
- `apps/proxy/server.js` — simplified verbose startup log messages
- `README.md` — updated with new endpoints, SSE architecture, removed fixed limitations

---

## How to Test

### Prerequisites

Make sure both `.env` files exist with your Auth0 credentials:
- `apps/proxy/.env` (copy from `apps/proxy/.env.example`)
- `apps/dashboard/.env.local` (copy from `apps/dashboard/.env.example`)

### 1. Install & Start

```bash
# From repo root
npm install

# Terminal 1 — Backend
cd apps/proxy
npm start
# Expected: "Midosoc gateway listening on http://localhost:3001"

# Terminal 2 — Dashboard
cd apps/dashboard
npm run dev
# Expected: "Ready on http://localhost:3000"
```

### 2. Run Tests (14 tests)

```bash
cd apps/proxy
npx jest
# Expected: 2 suites, 14 tests passed
```

### 3. Test Token Vault Loop (End-to-End)

```bash
cd scripts/simulator
pip install requests
python autonomous_client.py
```

**Expected terminal output:**
```
🤖 [Autonomous AI Agent] Initializing local tasks...
[AI Agent] Executing Task 1: Check Weather
✅ Response from Gateway: allowed (200)

[AI Agent] Executing Task 2: Delete legacy metrics database
⏳ Waiting for network response...
```

Now go to `http://localhost:3000`, click **Approve via Auth0** on the forensic card, then confirm in the modal.

**Expected terminal output continues:**
```
🚨 [AI Agent] ACTION APPROVED via Auth0 step-up!
Vault Delegation Token Received: eyJhbGciOiJSUzI1...

[AI Agent] Executing authorized action via External API with vault token...
✅ Action executed successfully: Action authorized and executed via Auth0 Token Vault delegation.
   Executed at: 2026-03-26T10:30:00.000Z
```

### 4. Test SSE Real-Time Updates

Open the dashboard in a browser. Open DevTools → Network → filter by `EventStream`. You should see a connection to `/api/proxy/queue/events`.

Now inject a payload via the Agent Simulator in the sidebar. The forensic card should appear **instantly** (no 1.5s delay) with a red pulse animation.

**To test SSE directly:**
```bash
curl -N -H "Authorization: Bearer local_dev_secret" http://localhost:3001/queue/events
```
Expected: `event: connected` followed by heartbeats every 15s.

### 5. Test Auth0 Login Flow

1. Go to `http://localhost:3000/auth/login` — should redirect to Auth0 Universal Login
2. After login, `http://localhost:3000/auth/profile` — should return user JSON
3. SOCHeader should show your name/email and a "Sign Out" link
4. Click "Sign Out" — should clear session and redirect

**Dev mode (no Auth0):** Everything works with `ADMIN_SECRET=local_dev_secret` when Auth0 env vars are not set.

### 6. Test Confirmation Modal

1. Inject a destructive payload via the Agent Simulator
2. Click **Approve via Auth0** — a styled modal should appear (not `window.confirm`)
3. Modal shows: action name, confidence score, flagged markers, warning text
4. Click **Confirm Authorize** — request approved, toast notification appears
5. Repeat with **Reject Drop** → **Confirm Reject** to test denial flow

### 7. Test Audit Trail

After approving or denying a few requests:

1. Check the "Decision Log" panel below the Agent Simulator (click to expand)
2. Should show recent decisions with timestamps, action names, and approved/denied badges

**Via API:**
```bash
curl -H "Authorization: Bearer local_dev_secret" http://localhost:3001/audit
```

**Via file:**
```bash
cat apps/proxy/data/audit.jsonl
```

### 8. Test with Docker Compose

```bash
docker compose up --build
# Proxy on :3001, Dashboard on :3000
# Run the same tests above against these ports
```

---

## New File Summary

| File | Type | Purpose |
|------|------|---------|
| `apps/proxy/auditLog.js` | Backend | Persistent JSONL audit trail |
| `apps/proxy/data/audit.jsonl` | Data | Auto-created audit log file |
| `apps/proxy/.env.example` | Config | Backend env var template |
| `apps/dashboard/.env.example` | Config | Frontend env var template |
| `apps/dashboard/src/middleware.ts` | Frontend | Next.js middleware (Auth0 SDK) |
| `apps/dashboard/src/components/soc/ConfirmModal.tsx` | Frontend | Styled confirmation modal |
| `apps/dashboard/src/components/soc/AuditLog.tsx` | Frontend | Decision log sidebar panel |
| `apps/dashboard/src/app/api/proxy/queue/events/route.ts` | Frontend | SSE proxy route |
| `scripts/pipelines/README.md` | Docs | Documents pipeline script |
