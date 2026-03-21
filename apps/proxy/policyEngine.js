const axios = require('axios');
const { logSOC } = require('./logger');

class PolicyEngine {
    static async evaluateIntention(payload) {
        const payloadStr = JSON.stringify(payload);
        const { OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENCLAW_API_BASE } = process.env;

        // 1. DYNAMIC LLM EVALUATION
        if (OPENCLAW_API_BASE || OPENAI_API_KEY) {
            const providerName = OPENCLAW_API_BASE ? 'Local OpenClaw' : 'OpenAI';
            logSOC('INFO', 'POLICY_ENGINE', `${providerName} integration detected. Routing to Native LLM Sidecar for Forensic Analysis...`);
            try {
                const response = await axios.post(
                    OPENCLAW_API_BASE || 'https://api.openai.com/v1/chat/completions',
                    {
                        model: OPENCLAW_API_BASE ? 'openclaw-v1' : 'gpt-4o-mini',
                        response_format: { type: "json_object" },
                        messages: [
                            {
                                role: 'system',
                                content: `You are an enterprise zero-trust security gateway SOC analyst. Analyze the following JSON payload originating from an autonomous AI agent.\nYou MUST respond in pure JSON format exactly like this:\n{\n  "classification": "SAFE" | "DESTRUCTIVE",\n  "confidence_score": <number 0-100>,\n  "rationale": "<1-sentence forensic explanation>",\n  "flagged_markers": ["<key1>"]\n}\n\nCRITICAL EVALUATION RULES:\n1. If the action deletes, drops, or alters data, classify as DESTRUCTIVE.\n2. If the action attempts CROSS-TENANT reading (e.g., looking at another tenant's data or comparing customers), this is an IDOR/BOLA data breach. MUST classify as DESTRUCTIVE.\n3. If it modifies permissions or executes financial transfers, classify as DESTRUCTIVE.\n4. ONLY classify as SAFE if it is a completely harmless, authorized, single-tenant simple read operation.`
                            },
                            {
                                role: 'user',
                                content: payloadStr
                            }
                        ],
                        temperature: 0,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${OPENAI_API_KEY || 'local-deployment'}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const resultStr = response.data.choices[0].message.content.trim();
                const decision = JSON.parse(resultStr);
                
                logSOC('SUCCESS', 'POLICY_ENGINE', `${providerName} Forensic Analysis complete.`, decision);

                return {
                    isDestructive: decision.classification === 'DESTRUCTIVE',
                    riskLevel: decision.classification === 'DESTRUCTIVE' ? 'CRITICAL_LLM_AI_CLASSIFICATION' : 'SECURE_LLM_AI_AUTHORIZATION',
                    confidenceScore: decision.confidence_score,
                    rationale: decision.rationale,
                    flaggedMarkers: decision.flagged_markers || []
                };
            } catch (e) {
                logSOC('WARN', 'POLICY_ENGINE', `${providerName} evaluation failed. Falling back securely to static heuristics.`, { error: e.message });
            }
        } else if (ANTHROPIC_API_KEY) {
            logSOC('INFO', 'POLICY_ENGINE', 'Anthropic integration detected. Routing to Claude Sidecar for Forensic Analysis...');
            try {
                const response = await axios.post(
                    'https://api.anthropic.com/v1/messages',
                    {
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 1000,
                        system: `You are an enterprise zero-trust security gateway SOC analyst. Analyze the following JSON payload originating from an autonomous AI agent.\nYou MUST respond in pure JSON format exactly like this:\n{\n  "classification": "SAFE" | "DESTRUCTIVE",\n  "confidence_score": <number 0-100>,\n  "rationale": "<1-sentence forensic explanation>",\n  "flagged_markers": ["<key1>"]\n}\n\nCRITICAL EVALUATION RULES:\n1. If the action deletes, drops, or alters data, classify as DESTRUCTIVE.\n2. If the action attempts CROSS-TENANT reading (e.g., looking at another tenant's data or comparing customers), this is an IDOR/BOLA data breach. MUST classify as DESTRUCTIVE.\n3. If it modifies permissions or executes financial transfers, classify as DESTRUCTIVE.\n4. ONLY classify as SAFE if it is a completely harmless, authorized, single-tenant simple read operation.`,
                        messages: [
                            { role: 'user', content: payloadStr },
                            { role: 'assistant', content: "{" }
                        ],
                        temperature: 0
                    },
                    {
                        headers: {
                            'x-api-key': ANTHROPIC_API_KEY,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // We prefilled the assistant response with {, so we need to add it back to the parsed string
                const resultStr = "{" + response.data.content[0].text.trim();
                const decision = JSON.parse(resultStr);
                
                logSOC('SUCCESS', 'POLICY_ENGINE', `Anthropic Claude Forensic Analysis complete.`, decision);

                return {
                    isDestructive: decision.classification === 'DESTRUCTIVE',
                    riskLevel: decision.classification === 'DESTRUCTIVE' ? 'CRITICAL_LLM_AI_CLASSIFICATION' : 'SECURE_LLM_AI_AUTHORIZATION',
                    confidenceScore: decision.confidence_score,
                    rationale: decision.rationale,
                    flaggedMarkers: decision.flagged_markers || []
                };
            } catch (e) {
                logSOC('WARN', 'POLICY_ENGINE', 'Anthropic Claude evaluation failed. Falling back securely to static heuristics.', { error: e.message });
            }
        }

        // 2. STATIC HEURISTIC FALLBACK
        const restrictedKeywords = ['delete', 'drop', 'remove', 'transfer_funds', 'grant_admin', 'purge', 'destroy'];
        const triggered = restrictedKeywords.filter(kw => payloadStr.toLowerCase().includes(kw));
        const riskScore = triggered.length > 0 ? 100 : 0;

        logSOC('INFO', 'POLICY_ENGINE', 'Static heuristic analysis complete.', { triggered, riskScore });

        return {
            isDestructive: riskScore >= 100,
            riskLevel: riskScore >= 100 ? 'CRITICAL_HEURISTIC_OVERRIDE' : 'SAFE_STATIC_EVALUATION',
            confidenceScore: riskScore >= 100 ? 95 : 100,
            rationale: riskScore >= 100 ? 'Payload securely triggered static keyword blocklist analysis.' : 'No sensitive structural keywords prominently detected by regex analyzer.',
            flaggedMarkers: triggered
        };
    }
}

module.exports = { PolicyEngine };
