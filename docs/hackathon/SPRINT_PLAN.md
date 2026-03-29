# Midosoc — Hackathon Sprint Plan

**Created:** March 26, 2026  
**Source:** VP R&D Review feedback ([vp_rnd_review.md](../reviews/vp_rnd_review.md))  
**Goal:** Address all review findings, close critical gaps, and deliver hackathon-ready submission  
**Score today:** 7.5/10 → **Target:** 9+/10

---

## Priority Legend

| Priority | Meaning | Impact on Winning |
|----------|---------|-------------------|
| 🔴 P0 | **Must-have** — blocks submission or credibility | Judges will reject without this |
| 🟠 P1 | **High-impact** — differentiates from competitors | Significantly increases win probability |
| 🟡 P2 | **Nice-to-have** — polishes the submission | Shows maturity, earns bonus points |

---

## Phase 1: Close the Token Vault Loop (🔴 P0)

> *"The single highest-impact improvement."* — VP Review §8  
> *"If the demo ends at 'token received,' the judges might ask 'so what?'"* — VP Review §4, Q1

**Problem:** The flow currently ends at "M2M token acquired and returned to agent." The agent doesn't *use* the token to call a real external API. This is the #1 credibility gap.

### Task 1.1 — Add a mock protected external API endpoint

Add `GET /external/execute` on the proxy backend that **requires a valid M2M token** to call. This simulates a real protected resource (database, cloud API). It validates the Bearer token via Auth0 JWKS and returns a success response confirming the action was authorized.

**File:** `apps/proxy/server.js`  
**What changes:**
```
New route: GET /external/execute
- Validates Bearer token (reuses authMiddleware in production mode)
- Returns: { status: "executed", action: <original_action>, authorizedAt: <timestamp> }
- If token invalid: 401 Unauthorized
```

**Completed flow after this change:**
```
Agent → /proxy/execute → [suspended] → Human approves → M2M token acquired
→ Response sent to agent with token → Agent calls /external/execute with token
→ ✅ "Action authorized and executed"
```

### Task 1.2 — Update the Python simulator to close the loop

After receiving the approval response (which contains the M2M vault token), the simulator immediately calls `/external/execute` with that token as a Bearer header. Print the final result to stdout so the demo terminal shows the complete end-to-end flow.

**File:** `scripts/simulator/autonomous_client.py`  
**What changes:**
```python
# After approval response received:
token = response.json()["vault_token"]
result = requests.get("/external/execute", headers={"Authorization": f"Bearer {token}"})
print(f"✅ Action executed with vault token: {result.json()}")
```

### Task 1.3 — Show token-used confirmation on the dashboard

After an analyst approves a request, show a toast or card update confirming "Token Vault → Token Issued → Agent Executed Action Successfully." This closes the visual loop for the audience watching the dashboard side.

**File:** `apps/dashboard/src/components/soc/ForensicCard.tsx`, `apps/dashboard/src/app/page.tsx`

---

## Phase 2: Fix Auth0 Integration (🔴 P0)

> *"If the demo video shows Auth0 login but the code tells a different story, that's a credibility hit."* — VP Review §3

### Task 2.1 — Wire up Auth0 session in the API proxy route

Replace the hardcoded `local_dev_secret` in `route.ts` with proper Auth0 session extraction. Keep dev fallback gated behind `NODE_ENV !== 'production'`.

**File:** `apps/dashboard/src/app/api/proxy/[...path]/route.ts`  
**What changes:**
```ts
// BEFORE (broken — hardcoded dev bypass):
const token = "local_dev_secret";

// AFTER (production-ready with dev fallback):
const session = await auth0.getSession();
const token = session?.tokenSet?.accessToken
  ?? (process.env.NODE_ENV !== 'production' ? "local_dev_secret" : null);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Task 2.2 — Ensure Auth0 SDK middleware is properly wired

The `useAuthProfile` hook calls `/auth/profile` but this endpoint only exists if the `@auth0/nextjs-auth0` middleware is correctly applied. Verify the middleware in `proxy.ts` is being used by Next.js, and that `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile` all resolve correctly.

**Files:** `apps/dashboard/src/proxy.ts`, `apps/dashboard/next.config.ts`  
**Verify:** `curl http://localhost:3000/auth/login` redirects to Auth0

### Task 2.3 — End-to-end auth verification

Manual test checklist:
- [ ] `/auth/login` → redirects to Auth0 Universal Login
- [ ] Auth0 callback → redirected back to dashboard with session
- [ ] `/auth/profile` → returns user JSON (name, email, permissions)
- [ ] SOCHeader shows authenticated user info
- [ ] Approve/Deny passes real access token to backend
- [ ] `/auth/logout` → clears session, redirects to login

---

## Phase 3: Real-Time Updates via SSE (🟠 P1)

> *"The 1.5s delay undermines the 'real-time' narrative. Even a basic SSE endpoint would make the demo feel instant."* — VP Review §8

### Task 3.1 — Add SSE endpoint on the proxy backend

Add `GET /queue/events` that keeps an SSE connection open. When a request is added, approved, or denied, push an event to all connected clients.

**File:** `apps/proxy/server.js`, `apps/proxy/queueManager.js`  
**What changes:**
- `queueManager.js`: Add an EventEmitter. Emit events on `add()`, `approve()`, `deny()`.
- `server.js`: Add `/queue/events` route that:
  - Sets `Content-Type: text/event-stream`
  - Keeps connection alive with heartbeat every 15s
  - Listens to queueManager events and writes SSE data
  - Cleans up on client disconnect

**Events emitted:**
```
event: request:added
data: {"id":"uuid","action":"delete_database","timestamp":"..."}

event: request:approved
data: {"id":"uuid"}

event: request:denied
data: {"id":"uuid"}
```

### Task 3.2 — Add SSE proxy route in the dashboard

Add a Next.js API route that proxies the SSE stream from the backend, passing through the auth token.

**File:** New `apps/dashboard/src/app/api/proxy/events/route.ts`

### Task 3.3 — Replace polling with SSE + polling fallback

Update `useQueuePolling` to use `EventSource` for real-time updates. On SSE events, immediately re-fetch the full queue. Keep the 1.5s polling as a fallback if SSE disconnects.

**File:** `apps/dashboard/src/hooks/useQueuePolling.ts`  
**Result:** Dashboard updates appear <100ms after agent sends request (vs. current 1.5s)

### Task 3.4 — Add arrival animation for new threats

When a new queue item arrives via SSE, pulse/flash the ForensicCard border to grab attention during the demo. CSS animation: red glow pulse for 2 seconds on entry.

**Files:** `apps/dashboard/src/components/soc/ForensicCard.tsx`, `apps/dashboard/src/app/globals.css`

---

## Phase 4: UX Polish (🟠 P1)

> *"window.confirm() is the biggest UX miss. A modal would match the overall aesthetic."* — VP Review §6

### Task 4.1 — Replace `window.confirm()` with a styled confirmation modal

Create a themed confirmation modal that matches the SOC dark/red aesthetic. Show:
- Action summary and risk level
- Confidence score badge
- "Confirm Authorization" (green) / "Confirm Rejection" (red) buttons
- Cancel option to go back

**Files:** New `apps/dashboard/src/components/soc/ConfirmModal.tsx`, update `apps/dashboard/src/app/page.tsx`

### Task 4.2 — Improve empty-state messaging

When the queue is empty, show an explicit "All Clear — No Active Threats Detected" card with a shield icon in the main area. Currently it shows a shield animation — verify it's clear and compelling, upgrade if needed.

**File:** `apps/dashboard/src/app/page.tsx`

### Task 4.3 — Add logout button to SOCHeader

Add a "Sign Out" button in the header so judges can see the full auth lifecycle (login → use → logout → redirect to login).

**File:** `apps/dashboard/src/components/soc/SOCHeader.tsx`

---

## Phase 5: Audit Trail (🟡 P2)

> *"Having even a simple JSON log file of decisions would strengthen the demo narrative."* — VP Review §3

### Task 5.1 — Add a persistent audit log file

On every approve/deny action, append a JSON line to `data/audit.jsonl`:
```json
{"timestamp":"...","requestId":"uuid","action":"delete_database","analyst":"jane@corp.com","decision":"approved","rationale":"Scheduled maintenance window"}
```

Expose via `GET /audit` (last 50 entries, auth-protected).

**Files:** New `apps/proxy/auditLog.js`, update `apps/proxy/server.js`

### Task 5.2 — Show recent decisions in the dashboard

Add a small "Decision Log" panel below the queue area. Shows the last 10 approve/deny decisions with timestamps, analyst names, and outcomes.

**Files:** New `apps/dashboard/src/components/soc/AuditLog.tsx`, update `apps/dashboard/src/app/page.tsx`

---

## Phase 6: Deployment (🔴 P0)

> *"A Railway/Render/Vercel deployment with a public URL would check the 'published link' box."* — VP Review §8

### Task 6.1 — Deploy proxy backend to Railway (or Render)

- Create Railway project, connect to repo
- Set root directory to `apps/proxy`
- Set all env vars: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `ALLOWED_ORIGINS`, `PORT`, `NODE_ENV=production`
- Confirm `https://<app>.railway.app/health` responds

### Task 6.2 — Deploy dashboard to Vercel

- Create Vercel project, connect to repo
- Set root directory to `apps/dashboard`
- Set all env vars: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`, `NEXT_PUBLIC_API_URL` (pointing to Railway backend)
- Confirm `https://<app>.vercel.app` loads dashboard

### Task 6.3 — Update Auth0 callback URLs

Add production URLs to Auth0 dashboard:
- Allowed Callback URLs: `https://<app>.vercel.app/auth/callback`
- Allowed Logout URLs: `https://<app>.vercel.app`
- Allowed Web Origins: `https://<app>.vercel.app`

### Task 6.4 — Update CORS on proxy

Add deployed dashboard URL to `ALLOWED_ORIGINS` env var on Railway.

### Task 6.5 — Production smoke test

Run Python simulator against production proxy URL. Verify full flow: inject → suspend → approve on dashboard → token used → action confirmed.

**⚠️ SSE caveat:** Vercel doesn't support long-lived SSE connections on serverless functions. Options:
- **Option A:** Dashboard connects to the backend SSE endpoint directly (add CORS for SSE route)
- **Option B:** Keep polling as primary for Vercel deployment, SSE for local/self-hosted
- **Option C:** Deploy dashboard to Railway too (not serverless)

---

## Phase 7: Demo Video (🔴 P0)

> *"This is a hard requirement."* — VP Review §8

### Task 7.1 — Write the demo script

| Time | Beat | Screen |
|------|------|--------|
| 0:00–0:15 | **Hook** | Black screen → text: *"Your AI agent just deleted your production database. Who authorized that?"* → Title card: **Midosoc** |
| 0:15–0:40 | **Problem statement** | Quick narration: AI agents are getting autonomous API access. No guardrails. One bad classification = catastrophe. We need human-in-the-loop auth for AI. |
| 0:40–1:10 | **Safe flow** | Split screen: terminal (simulator) + dashboard. Agent sends `get_weather` → instant 200 response. Gateway classifies as safe. No suspension. "Safe actions flow through instantly." |
| 1:10–2:10 | **Destructive flow (the money shot)** | Agent sends `delete_database` → terminal **hangs** (suspended socket!). Dashboard instantly lights up with forensic dossier. Show: LLM classification, confidence score 0.95, flagged markers `[delete, production]`. Analyst reviews → clicks **"Authorize via Token Vault"** → Auth0 Token Vault issues M2M token → terminal resumes → agent calls external API with vault token → ✅ **"Action authorized and executed."** |
| 2:10–2:30 | **Architecture** | Quick diagram: Agent → MIDOSOC Gateway → Policy Engine (LLM) → Human Review → Auth0 Token Vault → Protected API. Zero-trust. Defense-in-depth. |
| 2:30–2:50 | **Tech highlights** | "Suspended-socket pattern. Auth0 Token Vault delegation. LLM intent classification with heuristic fallback. Real-time SSE dashboard. 14 automated tests." |
| 2:50–3:00 | **Close** | "Midosoc. Auth0-powered human-in-the-loop authorization for autonomous AI agents." Live URL on screen. |

### Task 7.2 — Record the demo

- Tool: OBS Studio or built-in screen recorder
- Layout: Split-screen — terminal left, dashboard right
- Resolution: 1080p minimum
- Audio: Clear voiceover narration following the script
- Length: ≤3 minutes (hard cap)

---

## Phase 8: Blog Post (🟡 P2 — Bonus Points)

> *"250 words is low effort for bonus prize eligibility."* — VP Review §8

### Task 8.1 — Write and publish

**Title:** "How Auth0 Token Vault Enables Human-in-the-Loop Authorization for AI Agents"

**Outline (300–500 words):**
1. **The problem:** AI agents are gaining autonomous access to production APIs — who's authorizing destructive actions?
2. **Midosoc:** A zero-trust gateway that intercepts agent requests and classifies intent using LLM analysis
3. **The suspended-socket pattern:** How we hold the agent's HTTP connection open in memory until a human decides
4. **Auth0 Token Vault:** On approval, a delegation M2M token is issued via Client Credentials flow — the agent only gets the token *after* human step-up. On denial, no token is ever generated.
5. **What's next:** Persistent audit trail, webhook notifications, multi-agent policy management

**Publish to:** Dev.to or Hashnode (free, instant, shareable URL)

---

## Phase 9: Repo Cleanup (🟡 P2)

### Task 9.1 — Document the hackathon pipeline script

> *"It might confuse judges."* — VP Review §4, Q5

Add a `scripts/pipelines/README.md` explaining that `hackathon_pipeline.py` is a meta-tool used for ideation, not part of the product.

### Task 9.2 — Add `.env.example` files

Create `apps/proxy/.env.example` and `apps/dashboard/.env.example` with all variables documented and placeholder values. Judges who clone the repo should immediately know what to configure.

### Task 9.3 — Update README with live URLs and submission links

Add the deployed URLs to the README header. Link to the demo video and blog post.

### Task 9.4 — Clean up verbose log messages

Simplify the server startup banner from "MIDOSOC Zero-Trust Intelligent SOC Gateway Engine definitively running" to something professional.

---

## Execution Order

### Critical Path (must-do, in order):

```
1. Auth0 tenant setup (manual — create apps, set permissions)   ← Do this FIRST
2. Phase 2: Fix Auth0 integration in code                        ← Unblocks everything
3. Phase 1: Close Token Vault loop                                ← Highest judge impact
4. Phase 3: SSE real-time updates                                 ← Demo wow-factor
5. Phase 4: UX polish (modal, empty state, logout)               ← Visual impression
6. Phase 6: Deploy to Railway + Vercel                            ← Submission requirement
7. Phase 7: Record demo video                                     ← Hard submission requirement
```

### If time is short, cut in this order (last cuts first):

```
CUT LAST:   Phase 9 (repo cleanup)
CUT NEXT:   Phase 8 (blog post)
CUT NEXT:   Phase 5 (audit trail)
CUT NEXT:   Phase 4 tasks 4.2, 4.3 (keep 4.1 modal)
NEVER CUT:  Phases 1, 2, 6, 7
```

### Estimated effort by phase:

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Token Vault loop | ~1 hr | 🔴 P0 |
| Phase 2: Auth0 fix | ~1 hr | 🔴 P0 |
| Phase 3: SSE | ~1.5 hr | 🟠 P1 |
| Phase 4: UX polish | ~1 hr | 🟠 P1 |
| Phase 5: Audit trail | ~1 hr | 🟡 P2 |
| Phase 6: Deployment | ~1 hr | 🔴 P0 |
| Phase 7: Demo video | ~1.5 hr | 🔴 P0 |
| Phase 8: Blog post | ~30 min | 🟡 P2 |
| Phase 9: Repo cleanup | ~30 min | 🟡 P2 |
| **Total** | **~9 hrs** | |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Auth0 tenant not yet created | 🔴 Blocks ALL auth work | Set up Auth0 FIRST before writing any code. Create both apps (Web + M2M), configure RBAC permissions. |
| Vercel doesn't support SSE | 🟠 Real-time updates broken in prod | Have dashboard connect to backend SSE directly (CORS), or keep polling as fallback on Vercel |
| LLM API keys unavailable | 🟡 No AI-powered classification | Heuristic fallback works perfectly. Demo it confidently. Mention LLM support as "production-ready" |
| Demo recording takes too long | 🟠 Rushed submission | Write the script (Task 7.1) early. Practice once. Record in one or two takes. Polish is optional. |
| Railway/Render deployment issues | 🔴 No public URL | Have accounts on BOTH platforms ready. Deploy to whichever works first. Docker Compose is a backup. |
| Express 5 has breaking change | 🟡 Startup failure in prod | Already working locally; unlikely to break. Pin exact version in package-lock.json. |

---

## Pre-Submission Checklist

### Hard Requirements
- [ ] Public code repository (GitHub) — ✅ already exists
- [ ] Text description of the project — ✅ README.md
- [ ] Demo video (≤3 min) — ❌ **TODO**
- [ ] Published / live application link — ❌ **TODO**
- [ ] Uses Auth0 for AI Agents (Token Vault) — ✅ implemented, needs loop closure

### Quality Gates
- [ ] Auth0 login → dashboard → approve → token used → action confirmed (full E2E)
- [ ] SSE makes dashboard update instantly during demo (or polling fallback confirmed)
- [ ] `window.confirm` replaced with styled modal
- [ ] Python simulator terminal shows complete flow with vault token usage
- [ ] `npm test` passes (14 tests green)
- [ ] No hardcoded secrets in committed code (dev fallback gated behind `NODE_ENV`)
- [ ] CORS allows deployed dashboard URL
- [ ] README has live deployed URLs

### Bonus
- [ ] Blog post published with shareable URL
- [ ] Audit trail visible in dashboard
- [ ] OpenClaw integration prominently mentioned/demoed
