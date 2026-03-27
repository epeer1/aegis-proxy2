const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PolicyEngine } = require('./policyEngine');
const { logSOC } = require('./logger');
const { queueManager } = require('./queueManager');
const { requireAuth0JWT, requirePermission } = require('./authMiddleware');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { getVaultToken } = require('./tokenCache');
const { recordDecision, getRecentDecisions } = require('./auditLog');

const app = express();

// Secure CORS - allow only the dashboard by default, or an env var
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// Add body size limit
app.use(express.json({ limit: '100kb' }));


// =========================================================================
// ROUTE 1: THE UNIFIED AEGIS FIREWALL GATEWAY
// =========================================================================
const gatewayLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per IP
    message: { error: 'Too many requests, please try again later.' }
});

const payloadSchema = z.object({
    action: z.string().describe("The action the agent intends to take")
}).passthrough();

app.post('/proxy/execute', gatewayLimiter, async (req, res, next) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            logSOC('ERROR', 'GATEWAY', 'Malformed or empty payload strictly rejected.');
            return res.status(400).json({ error: 'Malformed Payload: Body is required.' });
        }
        
        try {
            payloadSchema.parse(req.body);
        } catch (e) {
            logSOC('ERROR', 'GATEWAY', 'Payload schema validation securely failed.');
            return res.status(400).json({ error: 'Malformed Payload: Invalid structure.', details: e.errors });
        }

        const classification = await PolicyEngine.evaluateIntention(req.body);

        if (!classification.isDestructive) {
            logSOC('SUCCESS', 'GATEWAY', `Semantic intent securely determined SAFE (Risk Index: ${classification.riskLevel}). Instantly approving gateway proxy bypass.`);
            return res.status(200).json({
                status: 'success',
                proxy_action: 'allowed',
                data: 'Read-only gateway action routed seamlessly without Auth0 policy escalation.',
                forensics: classification
            });
        }

        logSOC('WARN', 'GATEWAY', `Destructive Semantic Intent Detected! Markers: [${classification.flaggedMarkers.join(', ')}]. Suspending active payload string...`);

        const requestId = queueManager.add(req.body, classification, res);
        
        if (!requestId) {
             // Queue was full, handled by queueManager logs
             return res.status(503).json({ error: 'System overloaded. Active request queue is full.' });
        }
        
        logSOC('INFO', 'AEGIS_ENCLAVE', `Execution process ${requestId} locked flawlessly in RAM looping sockets. Awaiting SOC Level 1 dashboard authorization...`);
    } catch (err) {
        next(err);
    }
});

// =========================================================================
// ROUTE 2: THE APPROVER SWITCHBOARD (Human-in-the-loop Unlock)
// =========================================================================
app.post('/queue/approve/:id', requireAuth0JWT, requirePermission('approve:requests'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const suspendedRequest = queueManager.approve(id);
        
        if (!suspendedRequest) {
            logSOC('ERROR', 'APPROVER', `Systematic exception: Request ${id} missing in structured array sockets.`);
            return res.status(404).json({ error: 'Fundamental Process completely lost or already handled.' });
        }

        logSOC('SUCCESS', 'APPROVER', `Live Auth0 HUMAN-VERIFICATION AUTHENTICATED securely for Process ${id}!`);

        // Mandatory live Auth0 Token Vault execution linkage ping
        const vaultToken = await getVaultToken();

        logSOC('INFO', 'AEGIS_ENCLAVE', `Discharging locked execution loop back to agent.`);
        
        // Record audit trail
        recordDecision({
            requestId: id,
            action: suspendedRequest.payload?.action,
            decision: 'approved',
            analyst: req.user?.sub || 'admin',
            classification: suspendedRequest.classification,
        });
        
        if (!suspendedRequest.resolver.headersSent) {
            suspendedRequest.resolver.status(200).json({
                status: 'success',
                proxy_action: 'step_up_approved',
                auth0_vault_delegation: vaultToken,
                message: 'Destructive execution comprehensively routed natively under strict Auth0 zero-trust human-supervisor validation.'
            });
        }

        return res.json({ success: true, message: `Process ${id} successfully cleanly unlocked.` });
    } catch (err) {
        next(err);
    }
});

// =========================================================================
// ROUTE 3: THE DENIAL SWITCHBOARD (Reject Execution)
// =========================================================================
app.post('/queue/deny/:id', requireAuth0JWT, requirePermission('deny:requests'), (req, res, next) => {
    try {
        const { id } = req.params;
        const suspendedRequest = queueManager.deny(id);
        
        if (!suspendedRequest) {
            logSOC('ERROR', 'APPROVER', `Systematic exception: Request ${id} missing in structured array sockets.`);
            return res.status(404).json({ error: 'Fundamental Process completely lost or already handled.' });
        }

        logSOC('WARN', 'APPROVER', `Live SOC Authorization EXPLICITLY DENIED for Process ${id}!`);
        logSOC('INFO', 'AEGIS_ENCLAVE', `Terminating suspended request from execution loop.`);
        
        // Record audit trail
        recordDecision({
            requestId: id,
            action: suspendedRequest.payload?.action,
            decision: 'denied',
            analyst: req.user?.sub || 'admin',
            classification: suspendedRequest.classification,
        });
        
        if (!suspendedRequest.resolver.headersSent) {
            suspendedRequest.resolver.status(403).json({
                status: 'blocked',
                proxy_action: 'step_up_denied',
                message: 'Execution strictly prohibited by human SOC analyst during step-up authorization check.'
            });
        }

        return res.json({ success: true, message: `Process ${id} permanently discarded.` });
    } catch (err) {
        next(err);
    }
});

// =========================================================================
// SSE REAL-TIME QUEUE EVENTS
// =========================================================================
const sseClients = new Set();

app.get('/queue/events', requireAuth0JWT, requirePermission('view:queue'), (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    // Send initial heartbeat
    res.write('event: connected\ndata: {}\n\n');

    sseClients.add(res);
    logSOC('INFO', 'SSE', `Client connected. Active SSE clients: ${sseClients.size}`);

    // Heartbeat every 15 seconds
    const heartbeat = setInterval(() => {
        res.write('event: heartbeat\ndata: {}\n\n');
    }, 15000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
        logSOC('INFO', 'SSE', `Client disconnected. Active SSE clients: ${sseClients.size}`);
    });
});

function broadcastSSE(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(message);
    }
}

queueManager.on('request:added', (data) => broadcastSSE('request:added', data));
queueManager.on('request:approved', (data) => broadcastSSE('request:approved', data));
queueManager.on('request:denied', (data) => broadcastSSE('request:denied', data));

// =========================================================================
// MOCK EXTERNAL PROTECTED API (Token Vault loop closure)
// =========================================================================
app.post('/external/execute', requireAuth0JWT, (req, res) => {
    logSOC('SUCCESS', 'EXTERNAL_API', `Authorized action executed with valid vault token.`);
    res.json({
        status: 'executed',
        message: 'Action authorized and executed via Auth0 Token Vault delegation.',
        executedAt: new Date().toISOString(),
        payload: req.body || {},
    });
});

// =========================================================================
// AUDIT TRAIL ENDPOINT
// =========================================================================
app.get('/audit', requireAuth0JWT, requirePermission('view:queue'), (req, res) => {
    const decisions = getRecentDecisions(50);
    res.json(decisions);
});

// =========================================================================
// INTERNAL INFRASTRUCTURE SOC DASHBOARD REPORTING ROUTE
// =========================================================================
app.get('/queue', requireAuth0JWT, requirePermission('view:queue'), (req, res) => {
    res.json(queueManager.getAll());
});

// =========================================================================
// SYSTEM HEALTH ENDPOINT
// =========================================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        queueSize: queueManager.size()
    });
});

// =========================================================================
// GLOBAL ERROR HANDLER
// =========================================================================
app.use((err, req, res, next) => {
    logSOC('ERROR', 'SYSTEM', `Unhandled exception in route ${req.method} ${req.url}: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error. Request execution aborted.' });
});

// =========================================================================
// GRACEFUL SHUTDOWN
// =========================================================================
function shutdown() {
    logSOC('INFO', 'SYSTEM', 'Received kill signal, shutting down gracefully.');
    // Terminate all pending requests
    const pending = queueManager.getAll();
    pending.forEach(req => {
        const suspended = queueManager.deny(req.id);
        if (suspended && suspended.resolver && !suspended.resolver.headersSent) {
            suspended.resolver.status(503).json({ error: 'Gateway shutting down, request aborted.' });
        }
    });

    if (serverInstance) {
        serverInstance.close(() => {
            logSOC('INFO', 'SYSTEM', 'Closed out remaining connections.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export app for testing purposes
let serverInstance = null;
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    serverInstance = app.listen(PORT, () => {
        logSOC('SUCCESS', 'SYSTEM', `Aegis Proxy gateway listening on http://localhost:${PORT}`);
    });
} else {
    module.exports = { app, PolicyEngine, queueManager, serverInstance };
}
