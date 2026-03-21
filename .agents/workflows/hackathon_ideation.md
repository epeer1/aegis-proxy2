---
description: Multi-Persona Hackathon Ideation Pipeline
---

This workflow rigorously ideates, red-teams, and scores hackathon ideas by sequentially adopting three distinct AI personas (Visionary, Pragmatist, Contrarian), culminating in a final winning recommendation.

1. **Input & Normalize**
   Ask the user for the Hackathon Brief if it's not present in the context. Extract the core thematic goals, judging criteria, deadline, and hard constraints into a normalized format. Save this to an artifact `01_normalized_brief.md`.

2. **Divergent Ideation (The Visionary Persona)**
   Adopt the persona of a divergent brainstorming engine optimizing for high-impact, "wow" factor demos. Generate 8-12 highly creative, bold ideas based on the normalized brief. Optimize purely for originality. Save to `02_visionary_ideas.md` artifact.

3. **Pragmatic Ideation (The Pragmatist Persona)**
   Adopt the persona of a pragmatic hackathon veteran. Generate 8-12 highly practical, feasible ideas that perfectly leverage the sponsor technology and maximize the mathematical probability of winning based on the timeline. Save to `03_pragmatic_ideas.md` artifact.

4. **Contrarian Ideation (The Contrarian Persona)**
   Adopt the persona of a contrarian product strategist. Find the hidden assumptions in the brief and generate 8-12 highly differentiated ideas that explore unique edge-cases and avoid cliché "AI wrapper" traps. Save to `04_contrarian_ideas.md` artifact.

5. **Merge & Deduplicate**
   Act as a brutal deduplication engine. Review all generated ideas from the previous 3 steps. Cluster them by similarity, fiercely eliminate generic or overlapping concepts, and keep only the top 10 most distinct and strongest ideas overall. Save to `05_merged_ideas.md` artifact.

6. **Scoring Stage**
   Act as a strict hackathon judge. Score the top 10 distinct ideas from 1-10 on four vectors: Fit to Criteria, Originality, Feasibility, and Demo Value. Calculate a total score, sort the list, and explain the top rankings. Save to `06_scored_ideas.md` artifact.

7. **Critique & Red-Teaming**
   Act as a cynical venture capital investor and technical auditor. Red-team the top 5 highest-scored ideas. Brutally detail why judges might not actually care, what makes them too generic, what is too risky to build in time, and what competitors are overwhelmingly likely to build instead. Save to `07_critiqued_ideas.md` artifact.

8. **Final Decision & Deliverables**
   As the ultimate decision-maker, select the single best idea that provides the absolute optimal tradeoff between originality, feasibility, and win probability based on the harsh red-team critique. 
   
   Generate the complete deliverables for the winning idea:
   - Name and 1-sentence pitch
   - 30-second Demo Story
   - MVP Scope (strictly achievable in the time limit)
   - Why it heavily anchors to the judging criteria
   - Biggest risks and fallback plan
   
   Save to `08_winning_idea.md` artifact and present the final deliverables directly to the user in the chat.
