# Midosoc — Demo Video Recording Plan

**Platform:** Mac  
**Recording:** QuickTime Player (built-in, Cmd+Shift+5)  
**Editing + Text Overlays:** **CapCut Desktop** (free, Mac app — best for pasting text overlays)  
**Length:** ≤ 3 minutes  
**Style:** No voiceover. Text overlays only. Let the product speak.

> **Why CapCut?** Free, native Mac app, drag-and-drop text with animations, templates for caption styles, easy export to MP4/YouTube. Way better text tools than iMovie. Download: https://www.capcut.com/

---

## Pre-Recording Setup

### Browser
- Chrome, clean profile (no bookmarks bar, no extensions visible)
- Full screen (Cmd+Shift+F) or at least hide tab bar
- Font zoom: default (Cmd+0)

### Tabs to have open (in order)
1. `https://midosoc-dashboard-693775682816.us-central1.run.app` — logged out (shows login overlay)

### Screen
- Resolution: 1920×1080 or Retina equivalent
- Dark mode on Mac
- Hide dock (System Settings → Desktop & Dock → Automatically hide)
- No notifications (Focus mode ON)

---

## Recording Scenes

Record each scene as a **separate screen recording**. This makes editing much easier — you can trim, reorder, and add text between clips in CapCut.

---

### Scene 1 — Title Card (make in CapCut, not recorded)

**Duration:** 5 seconds  
**Create in CapCut** — black background, centered text:

```
MIDOSOC
Zero-Trust Human-in-the-Loop Authorization for AI Agents

Powered by Auth0 Token Vault
```

---

### Scene 2 — The Problem (make in CapCut, not recorded)

**Duration:** 8 seconds  
**Create in CapCut** — black background, text appears line by line:

```
AI agents are gaining autonomous access to production APIs.

They can delete databases. Revoke access. Transfer funds.

Who authorized that?
```

---

### Scene 3 — Login with Auth0

**Duration:** ~15 seconds  
**Text overlay (add in CapCut):** `"Real Auth0 authentication. Any user can sign in with Google."`

**What to record:**
1. Show the dashboard URL in the browser address bar briefly
2. The login overlay is visible (blurred dashboard behind it)
3. Click **"Sign In with Auth0"**
4. Auth0 Universal Login appears
5. Click **"Continue with Google"**
6. Pick your Google account
7. You land on the dashboard — your real name and avatar showing in the header

---

### Scene 4 — Safe Payload (Terminal + Dashboard)

**Duration:** ~15 seconds  
**Text overlay:** `"Safe actions pass through instantly. No human intervention needed."`  
**Layout:** Split-screen in CapCut — terminal left, dashboard right.

**Pre-step (before recording):** Open two windows side by side on your Mac:
- **Left:** Terminal, cd to project root
- **Right:** Chrome with the deployed dashboard (logged in)

**What to record (terminal):**
1. Type (or paste) and run:
```bash
PROXY_URL=https://midosoc-proxy-693775682816.us-central1.run.app \
ADMIN_SECRET=midosoc_prod_s3cr3t_2026 \
python3 scripts/simulator/safe_demo.py
```
2. Terminal shows:
```
🤖 [AI Agent] Sending safe request: get_weather...
✅ Response: allowed (200) — passed through instantly
```
3. Dashboard stays on "All Clear" — no threat card

> **Note:** Create `scripts/simulator/safe_demo.py` — a short version that only sends the safe payload (see bottom of this doc).

---

### Scene 5 — Destructive Payload: Terminal HANGS (THE MONEY SHOT)

**Duration:** ~35 seconds  
**Layout:** Split-screen — terminal left, dashboard right.  
**Text overlays (add in CapCut at specific moments):**
- When terminal hangs: `"Agent's HTTP connection is suspended in memory. Waiting for human authorization."`
- When dashboard lights up: `"Real-time SSE. Destructive action detected. AI-classified as CRITICAL."`

**What to record:**
1. In terminal, run:
```bash
PROXY_URL=https://midosoc-proxy-693775682816.us-central1.run.app \
ADMIN_SECRET=midosoc_prod_s3cr3t_2026 \
python3 scripts/simulator/destructive_demo.py
```
2. Terminal shows:
```
🤖 [AI Agent] Sending destructive request: delete_database...
⏳ Waiting for response... (socket suspended — human must authorize)
```
3. **Terminal is HANGING** — cursor blinking, no response. This is the suspended socket.
4. **Switch focus to dashboard (right side):**
   - Red threat count badge appears in header ("1 Threat")
   - ForensicCard with red glow pulse
   - Shows: Risk Level CRITICAL, Confidence Score, flagged markers
5. **Pause 3-4 seconds** on the forensic card — let the viewer read it

> **Note:** Create `scripts/simulator/destructive_demo.py` — sends only the destructive payload (see bottom of this doc).

---

### Scene 6 — Human Approves → Terminal Resumes → Token Vault Loop Closed

**Duration:** ~25 seconds  
**Layout:** Same split-screen — terminal left, dashboard right.  
**Text overlays:**
- On approve: `"SOC analyst authorizes. Auth0 Token Vault issues M2M delegation token."`
- On terminal resume: `"Agent receives vault token. Calls protected API. Action executed."`

**What to record (continuous from Scene 5 — same recording):**
1. Click **"Authorize"** on the forensic card
2. Confirmation modal appears — shows action summary, risk, confidence
3. Click **"Confirm Authorization"**
4. **IMMEDIATELY look at the terminal (left side)** — it resumes:
```
🚨 ACTION APPROVED via Auth0 step-up!
Vault Delegation Token Received: eyJhbGciOiJSUzI1NiIs...

[AI Agent] Executing authorized action via External API with vault token...
✅ Action executed successfully: Action authorized and executed via Auth0 Token Vault delegation.
```
5. Dashboard shows green toast + returns to "All Clear"

**This is the killer moment** — the terminal hanging and resuming proves the suspended-socket pattern is real.

---

### Scene 7 — Audit Trail

**Duration:** ~10 seconds  
**Text overlay:** `"Every decision logged. Analyst identity from Auth0 session. Full accountability."`

**What to record:**
1. Click the **"Decision Log"** panel to expand it
2. Show the approve entry — with your real email address as the analyst
3. Hover for a moment so viewer can read

---

### Scene 8 — Sign Out

**Duration:** ~5 seconds  
**Text overlay:** `"Full auth lifecycle. Login → Review → Authorize → Logout."`

**What to record:**
1. Click **"Sign Out"** in the header
2. Back to the login overlay

---

### Scene 9 — Architecture Diagram (make in CapCut, not recorded)

**Duration:** 8 seconds  
**Create in CapCut** — black background with this flow diagram as text:

```
AI Agent
    ↓
MIDOSOC Gateway (Policy Engine)
    ↓ LLM Classification
    ↓
[SAFE] → Instant Pass-Through
[DESTRUCTIVE] → Suspended in Memory
    ↓
SOC Dashboard (Real-Time SSE)
    ↓ Human Reviews
    ↓
Auth0 Token Vault → M2M Token Issued
    ↓
Agent Receives Token → Executes Action
```

---

### Scene 10 — Tech Highlights (make in CapCut, not recorded)

**Duration:** 8 seconds  
**Create in CapCut** — black background, bullet list:

```
✓ Suspended-socket pattern — agent HTTP held in RAM until human decides
✓ Auth0 Token Vault — M2M delegation only after human step-up
✓ LLM intent classification with heuristic fallback
✓ Real-time SSE dashboard updates
✓ 14 automated tests
✓ Zero-trust defense-in-depth architecture
```

---

### Scene 11 — Closing Card (make in CapCut, not recorded)

**Duration:** 5 seconds  
**Create in CapCut** — black background:

```
MIDOSOC

Auth0-powered human-in-the-loop authorization
for autonomous AI agents.

https://midosoc-dashboard-693775682816.us-central1.run.app
```

---

## Editing Checklist (in CapCut)

1. Import all screen recordings
2. Trim dead time (mouse searching, loading spinners beyond 1s)
3. Add text overlays per scene above — use white text on semi-transparent black bar at bottom
4. Add the CapCut title/text-only scenes (Scenes 1, 2, 9, 10, 11) between recordings
5. Optional: add subtle background music (CapCut has free tracks — pick something minimal/techy)
6. Speed up any loading/transition moments (1.5x–2x)
7. Total time check: must be ≤ 3:00
8. Export: 1080p MP4
9. Upload to YouTube (Unlisted) → get shareable link

---

## Time Budget

| Scene | Type | Duration |
|-------|------|----------|
| 1. Title | CapCut text | 5s |
| 2. Problem | CapCut text | 8s |
| 3. Auth0 Login | Screen recording | 15s |
| 4. Safe payload | Split-screen recording | 15s |
| 5. Destructive payload (hangs!) | Split-screen recording | 35s |
| 6. Approve → terminal resumes | Split-screen recording | 25s |
| 7. Audit trail | Screen recording | 10s |
| 8. Sign out | Screen recording | 5s |
| 9. Architecture | CapCut text | 8s |
| 10. Tech highlights | CapCut text | 8s |
| 11. Closing | CapCut text | 5s |
| **Total** | | **~2:19** |

Buffer of ~40 seconds for transitions and pacing.

---

## Payloads to Copy-Paste During Recording

**Safe payload (Scene 4):**
```json
{"agent_id":"weather-bot","action":"get_weather","target":"tel_aviv","reasoning":"User asked for forecast"}
```

**Destructive payload (Scene 5):**
```json
{"agent_id":"nexus-09","action":"delete_database","target":"production_users","reasoning":"Optimizing storage space"}
```

---

## Tips

- **Record at normal speed**, speed up in editing. Looks more natural.
- **Move the mouse deliberately** — don't wander. Judges follow your cursor.
- **Pause 2-3 seconds** after each important moment (threat card appearing, approval toast). Gives you room for text overlays.
- **Clear the queue before recording** — make sure you start from "All Clear" state. If there are stale items, approve/deny them first.
- **Test the full flow once** before hitting record. Make sure Google login works, payload gets classified, approval works.
