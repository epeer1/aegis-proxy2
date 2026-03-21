import os
import json
import asyncio
from typing import List
from pydantic import BaseModel, Field
import instructor
from litellm import acompletion
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Initialize async instructor client over litellm
# Note: Ensure you have your API keys set in your environment:
# export GEMINI_API_KEY="..."
# export OPENAI_API_KEY="..."
client = instructor.from_litellm(acompletion)

# ==========================================
# 1. SCHEMAS (Pydantic Models)
# ==========================================
class NormalizedBrief(BaseModel):
    challenge_theme: str
    must_have_constraints: List[str]
    likely_judging_priorities: List[str]
    sponsor_technology_expectations: List[str]
    execution_time_constraints: str

class Idea(BaseModel):
    title: str
    one_line_pitch: str
    target_user: str
    core_problem: str
    why_it_fits_hackathon: str
    wow_demo_factor: str
    feasibility_in_time: str
    risk_level: str
    differentiator: str

class IdeaList(BaseModel):
    ideas: List[Idea]

class ScoredIdea(Idea):
    fit_score: int = Field(ge=1, le=10)
    originality_score: int = Field(ge=1, le=10)
    feasibility_score: int = Field(ge=1, le=10)
    demo_value_score: int = Field(ge=1, le=10)
    total_score: int

class ScoredIdeaList(BaseModel):
    scored_ideas: List[ScoredIdea]

class CritiquedIdea(ScoredIdea):
    why_judges_might_not_care: str
    what_is_too_generic: str
    what_is_too_risky_or_big: str
    likely_competitors_will_build: str

class CritiquedIdeaList(BaseModel):
    critiqued_ideas: List[CritiquedIdea]

class FinalDecision(BaseModel):
    best_final_idea: str
    top_5_ranked_titles: List[str]
    why_it_won: str
    one_sentence_pitch: str
    thirty_second_pitch: str
    mvp_scope: str
    demo_story: str
    biggest_risks: str
    fallback_reduced_scope_version: str

# ==========================================
# 2. HELPER FUNCTIONS
# ==========================================
def save_artifact(stage_name: str, data: BaseModel):
    os.makedirs("artifacts", exist_ok=True)
    filepath = f"artifacts/{stage_name}.json"
    with open(filepath, "w") as f:
        f.write(data.model_dump_json(indent=2))
    logging.info(f"Saved artifact to {filepath}")

async def call_llm(model: str, system: str, user: str, response_model: type[BaseModel]) -> BaseModel:
    logging.info(f"Calling {model} for structured {response_model.__name__} extraction...")
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        response_model=response_model
    )
    return response

# ==========================================
# 3. PIPELINE STAGES
# ==========================================

async def stage_2_normalize(brief_text: str) -> NormalizedBrief:
    sys_prompt = "You are an elite hackathon analyst. Extract the core thematic goals and hard constraints. Focus purely on facts, stripping away marketing fluff. Isolate what judges will actually prioritize."
    result = await call_llm("gpt-4o", sys_prompt, brief_text, NormalizedBrief)
    save_artifact("02_normalized_brief", result)
    return result

async def stage_3_ideate(normalized: NormalizedBrief) -> List[Idea]:
    input_text = f"Normalized Context:\n{normalized.model_dump_json(indent=2)}"
    
    # 3a. Gemini (Visionary)
    sys_gemini = "You are a divergent brainstorming engine optimizing for high-impact, 'wow' factor demos. Generate 8-12 highly creative, bold ideas. Avoid generic SaaS wrappers."
    
    # 3b. ChatGPT (Pragmatist)
    sys_gpt = "You are a pragmatic hackathon veteran. Generate 8-12 highly practical ideas that perfectly leverage the sponsor technology and hit the judging criteria safely."
    
    # 3c. Claude (Contrarian)
    sys_claude = "You are a contrarian product strategist. Find hidden assumptions. Generate 8-12 highly differentiated ideas that avoid cliché traps."

    logging.info("Starting parallel ideation (using Gemini for vision, GPT-4o for strategy + contrarian)...")
    task_gemini = call_llm("gemini/gemini-1.5-pro", sys_gemini, input_text, IdeaList)
    task_gpt = call_llm("gpt-4o", sys_gpt, input_text, IdeaList)
    task_claude = call_llm("gpt-4o", sys_claude, input_text, IdeaList)
    
    res_gemini, res_gpt, res_claude = await asyncio.gather(task_gemini, task_gpt, task_claude)
    
    save_artifact("03a_gemini_ideas", res_gemini)
    save_artifact("03b_gpt_ideas", res_gpt)
    save_artifact("03c_claude_ideas", res_claude)
    
    all_ideas = res_gemini.ideas + res_gpt.ideas + res_claude.ideas
    return all_ideas

async def stage_5_merge_dedup(all_ideas: List[Idea]) -> IdeaList:
    # We pass the raw list of dictionaries as JSON string
    ideas_json = json.dumps([i.model_dump() for i in all_ideas], indent=2)
    sys_prompt = "You are a deduplication engine. Cluster these ~30 hackathon ideas by similarity, aggressively eliminate overlapping concepts, and return the top 10 most distinct and strongest ideas overall."
    
    result = await call_llm("gpt-4o", sys_prompt, ideas_json, IdeaList)
    save_artifact("05_merged_deduped_ideas", result)
    return result

async def stage_6_score(distinct_ideas: IdeaList, normalized: NormalizedBrief) -> ScoredIdeaList:
    input_text = f"Constraints:\n{normalized.model_dump_json(indent=2)}\n\nIdeas:\n{distinct_ideas.model_dump_json(indent=2)}"
    sys_prompt = "You are a strict hackathon judge. Score each idea from 1-10 on: Fit to criteria, Originality, Feasibility, Demo value. Add a total score and return the sorted list."
    
    result = await call_llm("gpt-4o", sys_prompt, input_text, ScoredIdeaList)
    result.scored_ideas.sort(key=lambda x: x.total_score, reverse=True)
    save_artifact("06_scored_ideas", result)
    return result

async def stage_7_critique(top_ideas: ScoredIdeaList) -> CritiquedIdeaList:
    # Only take Top 5
    top_5 = top_ideas.scored_ideas[:5]
    input_text = json.dumps([i.model_dump() for i in top_5], indent=2)
    
    sys_prompt = "You are a cynical VC and technical auditor. Red-team these 5 ideas. Detail why judges might not care, what is generic, what is too risky/big, and likely competitors."
    
    result = await call_llm("gpt-4o", sys_prompt, input_text, CritiquedIdeaList)
    save_artifact("07_critiqued_ideas", result)
    return result

async def stage_8_final_judge(critiqued_ideas: CritiquedIdeaList, normalized: NormalizedBrief) -> FinalDecision:
    input_text = f"Constraints:\n{normalized.model_dump_json()}\n\nCritiqued Top 5:\n{critiqued_ideas.model_dump_json(indent=2)}"
    sys_prompt = "You are the ultimate decision-maker. Review the critiqued ideas and select the single best idea that provides the optimal tradeoff between originality, feasibility, and win probability. Output comprehensive deliverables."
    
    result = await call_llm("gpt-4o", sys_prompt, input_text, FinalDecision)
    save_artifact("08_final_decision", result)
    return result

# ==========================================
# 4. ORCHESTRATOR
# ==========================================
async def orchestrate_hackathon_pipeline(brief_text: str):
    logging.info("🚀 Starting Multi-Model Hackathon Ideation Pipeline...")
    
    logging.info("Stage 2: Normalization")
    normalized = await stage_2_normalize(brief_text)
    
    logging.info("Stage 3: Multi-Model Ideation")
    all_ideas = await stage_3_ideate(normalized)
    logging.info(f"Total raw ideas generated: {len(all_ideas)}")
    
    logging.info("Stage 5: Merge & Deduplicate")
    distinct_ideas = await stage_5_merge_dedup(all_ideas)
    logging.info(f"Distinct ideas post-merge: {len(distinct_ideas.ideas)}")
    
    logging.info("Stage 6: Scoring")
    scored_ideas = await stage_6_score(distinct_ideas, normalized)
    
    logging.info("Stage 7: Critique / Red-Teaming (Top 5)")
    critiqued_ideas = await stage_7_critique(scored_ideas)
    
    logging.info("Stage 8: Final Decision")
    final_decision = await stage_8_final_judge(critiqued_ideas, normalized)
    
    logging.info("🎉 Pipeline Complete!")
    print("\n" + "="*50)
    print("🏆 WINNING IDEA:", final_decision.best_final_idea)
    print("="*50)
    print(final_decision.model_dump_json(indent=2))

# ==========================================
# ENTRY POINT
# ==========================================
if __name__ == "__main__":
    sample_brief = """
    Hackathon: Authorized to Act (Auth0 for AI Agents)
    Theme: Push the boundaries of generative AI and leverage Auth0 for AI Agents Token Vault. 
    Context: The prompt mentions local models (like OpenClaw) running in restricted mode and securely communicating with the outside world through an intermediary agent. Explicitly mentions utilizing async auth or step-up authentication.
    Requirements: Must use Token Vault feature. Submit text description + demo video (3 mins) + public code repo + published link/APK.
    Deadline: 19 days from launch.
    """
    asyncio.run(orchestrate_hackathon_pipeline(sample_brief))
