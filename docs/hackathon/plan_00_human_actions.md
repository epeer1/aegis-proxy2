# 0. Master Checklist of Human Actions & Dependencies

## Priority: Must Do Now (Phase 0: Frontloaded)
*Per architectural review, absolutely all fundamental account and policy setup has been aggressively shifted to the very beginning of the timeline timeline to prevent mid-development halting sprints.*

### 1. Create Auth0 Account & Tenant
- **Why it is needed:** The Auth0 SDK literally cannot initialize without a Client ID and Secret.
- **Provider/System:** Auth0 (Okta) Platform
- **Input Required from Einav:** Sign up/Login, create a new Tenant, approve basic developer consents.
- **What the Agent can prepare:** I can build pure visual/proxy files in parallel.
- **What is Blocked:** `Phase 3` Backend integration.

### 2. Enable Token Vault & Generate `.env` Secrets
- **Why it is needed:** To explicitly generate the Agent-scoped permissions keys.
- **Provider/System:** Auth0 Dashboard (Settings)
- **Input Required from Einav:** Click "Enable Token Vault" in the UI, grab `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`, and paste into local `.env`.
- **What is Blocked:** `Phase 3`.

### 3. Configure Step-Up Policy Rules
- **Why it is needed:** We must explicitly tell Auth0 *which* Mock API endpoints inherently require Human Step-Up vs automatically passing tokens.
- **When it must happen:** Phase 0 (Frontloaded—moved up from Phase 4 to prevent blocking frontend integration later down the line).
- **Provider/System:** Auth0 Dashboard (Policies View)
- **What is Blocked:** `Phase 4` React interface button processing.

## Priority: Optional / Stretch

### 4. Provision Twilio Credentials
- **Why it is needed:** For sending physical SMS challenge codes to your phone during Step-Up.
- **Provider/System:** Twilio Dashboard
- **Action:** Very safe to postpone entirely. We are heavily favoring the web "Approve" button internal route to reduce cross-provider dependency bloat.

---
**Workflow Execution Isolation:**
- **[Human Tasks]:** Master Auth0 Account Registration, Dashboard Configuration, Token Vault toggle, Policy injection, creating local `.env` keys.
- **[Agent Tasks]:** Implementing Node proxy routing, assembling Next.js UI grids, constructing polling logic, writing Python mock clients securely.
