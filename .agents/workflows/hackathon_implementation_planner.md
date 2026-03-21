---
description: Enhanced Hackathon Implementation Planner
---

This workflow aggressively audits a winning hackathon idea before writing the technical implementation plan. It ensures the architecture remains highly practical, explicitly mitigates hackathon-specific risks, deliberately cuts corners where appropriate, maximizes judging alignment, and maps all external human dependencies immediately.

**Additional Planning Rules:**
- If an integration depends on external accounts, billing, OAuth setup, approvals, or provider dashboards, surface this early. Do not bury it inside later implementation steps.
- Try to reduce human setup burden where possible (e.g., prefer mock auth before full OAuth if allowed, local mock data before cloud storage, one provider over multiple, or narrowed sponsor-tech visibility).

1. **The Core Thesis Review (Overview & Alignment)**
   Analyze the provided winning idea overview. 
   - Check against prompt constraints, sponsor technologies, and "wow" factor.
   Output findings in `plan_01_core_thesis.md`.

2. **Human Actions & External Dependencies Review**
   Identify every point where the human must step in to complete setup, access, authentication, approvals, or provider-side configuration (e.g. creating cloud accounts, enabling billing, generating API keys, granting OAuth permissions, setting redirect URLs, etc).
   - For every human-required action, include: exact action title, why it's needed, when it must happen, which provider/system it belongs to, what input is required from the human, what the agent can prepare in advance, what is blocked until finished, and a fallback plan.
   - Distinctly Group: Master checklist by phase/provider, assigning Priority Labels (must do now, before implementation, before demo, optional) and estimated urgency.
   - Separate workflow capacities into: Agent Tasks, Human Tasks, Blockers, Parallel tasks.
   Output a dedicated artifact: `plan_00_human_actions.md`.

3. **Risk & Challenge Mapping (The "Gotchas")**
   Act as a cynical systems architect to map failure vectors (Top 3 tech challenges, Top 3 hackathon challenges, and exact mitigations).
   Save to `plan_02_risks.md`.

4. **Hackathon Speed vs. "Good Practice" Audit**
   Explicitly declare where to cut corners (e.g. skip DB) and where to demand absolute perfection (e.g. sponsor API integration).
   Save to `plan_03_speed_audit.md`.

5. **Structural Architecture & Dependencies**
   Define the absolute minimal viable tech stack. Provide Sanity Checks against the timeline.
   Save to `plan_04_architecture.md`.

6. **The Chronological Implementation Blueprint**
   Generate a highly practical, step-by-step coding checklist (organized chronologically).
   - *CRITICAL:* Every single phase and internal step must explicitly mark `[Agent]`, `[Human]`, or `[Blocked]` next to it.
   - *CRITICAL:* At the end of every single phase, append a strictly defined `[Test]` validation boundary explicitly outlining how to test and fully-proof the phase architecture before the engineers are allowed to proceed forward.
   Save to `plan_05_blueprint.md` (and update `task.md` to strictly feature these same assignments and testing nodes).

7. **The 3-Minute Demo Script & Final Output**
   Map the technical architecture back to the 3-minute video requirement.
   Save to `plan_06_demo_script.md`.
   *Final Output:* In the final chat summary, explicitly include a section called **"Things Einav must do manually"** outlining the exact order, platforms, blockers, and what is safe to postpone!
