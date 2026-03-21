const { PolicyEngine } = require('../server');

describe('PolicyEngine Zero-Trust Intention Evaluation', () => {
    // Save original env vars to isolate tests
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        // Silence console logs during tests to keep output clean
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterAll(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    test('1. Static Heuristic - SAFE Evaluation (No LLM API Key)', async () => {
        delete process.env.OPENAI_API_KEY; // Force static heuristic fallback
        delete process.env.ANTHROPIC_API_KEY;

        const payload = { user: "agent_007", action: "get_weather", location: "NYC" };
        const result = await PolicyEngine.evaluateIntention(payload);
        
        expect(result.isDestructive).toBe(false);
        expect(result.riskLevel).toBe('SAFE_STATIC_EVALUATION');
        expect(result.flaggedMarkers).toEqual([]);
        expect(result.confidenceScore).toBe(100);
    });

    test('2. Static Heuristic - DESTRUCTIVE Evaluation', async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        
        // "delete" and "drop" are in restrictedKeywords
        const payload = { action: "delete_database", target: "drop_tables" };
        const result = await PolicyEngine.evaluateIntention(payload);
        
        expect(result.isDestructive).toBe(true);
        expect(result.riskLevel).toBe('CRITICAL_HEURISTIC_OVERRIDE');
        expect(result.flaggedMarkers).toContain('delete');
        expect(result.flaggedMarkers).toContain('drop');
    });

    test('3. Static Heuristic - Empty Payload', async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        
        const payload = {};
        const result = await PolicyEngine.evaluateIntention(payload);
        
        expect(result.isDestructive).toBe(false);
        expect(result.riskLevel).toBe('SAFE_STATIC_EVALUATION');
    });

    test('4. Static Heuristic - Obfuscated Payload (Nested Keys)', async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        
        const payload = { 
            innocent_look: "just checking",
            deeply: {
                nested: {
                    action: "purge_everything"
                }
            }
        };
        const result = await PolicyEngine.evaluateIntention(payload);
        
        expect(result.isDestructive).toBe(true);
        expect(result.flaggedMarkers).toContain('purge');
    });

    test('5. Static Heuristic - Boundary Conditions', async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        
        // Very long payload with the keyword at the very end
        const longString = "x".repeat(10000) + " destroy";
        const payload = { data: longString };
        const result = await PolicyEngine.evaluateIntention(payload);
        
        expect(result.isDestructive).toBe(true);
        expect(result.flaggedMarkers).toContain('destroy');
    });
});
