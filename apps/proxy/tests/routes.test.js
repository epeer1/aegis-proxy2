const request = require('supertest');
const { app, queueManager } = require('../server');

describe('Midosoc Integrated Routes', () => {

    beforeEach(() => {
        // Clear queue before each test
        queueManager.queue = [];
        // Silence console logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        
        // By default for tests, ensure we are falling back to ADMIN_SECRET for token checks
        delete process.env.AUTH0_DOMAIN;
        process.env.ADMIN_SECRET = 'test_secret';

        // Ensure LLM keys are unset to force the deterministic heuristic engine for local tests
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENCLAW_API_BASE;
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('GET /health', () => {
        it('should return 200 OK and queue size', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('ok');
            expect(res.body.queueSize).toEqual(0);
        });
    });

    describe('POST /proxy/execute', () => {
        it('should reject empty payloads with 400', async () => {
            const res = await request(app)
                .post('/proxy/execute')
                .send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('Malformed Payload');
        });

        it('should instantly allow SAFE payloads', async () => {
            const payload = { action: 'check_status' };
            const res = await request(app)
                .post('/proxy/execute')
                .send(payload);
            expect(res.statusCode).toEqual(200);
            expect(res.body.proxy_action).toEqual('allowed');
        });

        it('should intercept DESTRUCTIVE payloads and hang (until timeout)', async () => {
            const payload = { action: 'delete_database' };
            
            // We use a small mock to not wait the full default supertest timeout,
            // we just want to ensure it gets added to the queue
            request(app).post('/proxy/execute').send(payload).end();
            
            // Wait slightly for async handler to run
            await new Promise(r => setTimeout(r, 100));
            
            expect(queueManager.size()).toEqual(1);
            const reqInQueue = queueManager.getAll()[0];
            expect(reqInQueue.classification.isDestructive).toBe(true);
        });
    });

    describe('GET /queue', () => {
        it('should return pending queue items', async () => {
            // Force a payload into queue manager explicitly
            queueManager.add({ test: 'payload' }, { isDestructive: true }, { headersSent: false });
            
            const res = await request(app)
                .get('/queue')
                .set('Authorization', 'Bearer test_secret');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toEqual(1);
            expect(res.body[0].payload.test).toEqual('payload');
        });
    });

    describe('POST /queue/approve/:id', () => {
        it('should reject unauthorized request (no token)', async () => {
            const res = await request(app).post('/queue/approve/123');
            expect(res.statusCode).toEqual(401);
        });

        it('should return 404 for invalid ID (with token)', async () => {
            const res = await request(app)
                .post('/queue/approve/nonexistent')
                .set('Authorization', 'Bearer test_secret');
            expect(res.statusCode).toEqual(404);
        });

        it('should approve valid ID and resolve frozen request', async () => {
            // Mock Express response object
            const mockRes = {
                headersSent: false,
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            const id = queueManager.add({ test: 'payload' }, { isDestructive: true }, mockRes);
            expect(queueManager.size()).toEqual(1);

            const res = await request(app)
                .post(`/queue/approve/${id}`)
                .set('Authorization', 'Bearer test_secret');
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(queueManager.size()).toEqual(0);
            
            // Verify the mock socket got the response it expected
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                proxy_action: 'step_up_approved'
            }));
        });
    });

    describe('POST /queue/deny/:id', () => {
        it('should deny valid ID and resolve frozen request with 403', async () => {
            const mockRes = {
                headersSent: false,
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            const id = queueManager.add({ test: 'payload' }, { isDestructive: true }, mockRes);

            const res = await request(app)
                .post(`/queue/deny/${id}`)
                .set('Authorization', 'Bearer test_secret');
            
            expect(res.statusCode).toEqual(200);
            expect(queueManager.size()).toEqual(0);
            
            // Verify socket got 403
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                proxy_action: 'step_up_denied'
            }));
        });
    });
});
