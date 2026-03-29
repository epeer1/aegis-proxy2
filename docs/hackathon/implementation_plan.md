# Midosoc Hub

**Goal Description:** 
Build "The Midosoc", a visual security middlebox that intercepts untrusted local AI requests and pauses sensitive actions for strict human Step-Up Authentication explicitly using the Auth0 For AI Agents Token Vault. We are fiercely optimizing for a 19-day deadline and the mandated 3-minute video demo.

## User Review Required
> [!IMPORTANT]
> **Intentional Corner Cutting for Speed:**
> 1. Are you okay with skipping a physical database and keeping pending proxy requests purely in a Node.js runtime memory array? (It vanishes on restart, but saves 2 days of dev time).
> 2. Are you okay with hardcoding the python "AI" script to strictly hit two exact API endpoints instead of building a full LLM prompting framework? (This lets us focus 100% on the Auth0 Token Vault, which is what the judges will actually score).

## Human External Dependencies
> [!WARNING]
> This architecture explicitly relies on external dashboard configurations setup by you (the human). For a comprehensive breakdown of blockages, fallbacks, and required inputs across Auth0, view the dedicated **[plan_00_human_actions.md](file:///Users/einav/.gemini/antigravity/brain/9b1d77ae-8bca-4656-9462-6b81c2977b07/plan_00_human_actions.md)** artifact.

## Proposed Changes

### 1. The Proxy Architecture (Backend)
The core interception engine running locally on Node.js.
#### [NEW] [server.js](file:///Users/einav/Repos/PromptWorkflow/midosoc/server.js)
- Express server running on port `3001`.
- In-memory `REQUEST_QUEUE` array.
- `POST /proxy/safe` endpoint (auto-approves instantly).
- `POST /proxy/sensitive` endpoint (suspends request in queue, waiting for Auth0 release).

### 2. The Identity Layer (Auth0 Integration)
The heavy-lifting bridging the proxy to the user.
#### [NEW] [auth.js](file:///Users/einav/Repos/PromptWorkflow/midosoc/auth.js)
- Integrates strictly with the Auth0 SDK.
- Handles OAuth token retrieval and triggers the Step-Up mechanisms.

### 3. The Visual Dashboard (Frontend)
The sleek Next.js UI that the judges will physically watch in the demo.
#### [NEW] [page.tsx](file:///Users/einav/Repos/PromptWorkflow/midosoc-dashboard/app/page.tsx)
- Automatically polls `localhost:3001/queue` every 1,000ms.
- Visually renders pending sensitive requests with aggressive red styling.
- Renders the physical "Approve Request via Auth0 Token Vault" button to release the token.

### 4. The Python AI Client
The mock orchestrator.
#### [NEW] [mock_agent.py](file:///Users/einav/Repos/PromptWorkflow/mock_agent.py)
- A simplistic python script simulating a local LLM requesting external APIs.
- Prints highly visible dramatic logs to the terminal (`"Waiting for Auth0 external step-up authorization..."`).

## Verification Plan

### Automated Tests
- N/A. We are explicitly, ruthlessly cutting unit tests to optimize entirely for the 19-day hackathon speed constraint.

### Manual Verification
1. Run `node server.js` and `npm run dev` side-by-side.
2. Execute `python mock_agent.py` in a split-terminal.
3. Verify the *safe* API returns 200 immediately.
4. Verify the *sensitive* API physically hangs the python script.
5. Verify the React dashboard vividly flashes red.
6. Click "Approve" explicitly in the dashboard.
7. Verify the python script successfully receives the OAuth token and completes the run.
8. Record the exact 3-minute screen capture and submit!
