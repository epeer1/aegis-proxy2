const fs = require('fs');
const path = require('path');
const { logSOC } = require('./logger');

const AUDIT_FILE = path.join(__dirname, 'data', 'audit.jsonl');

// Ensure data directory exists
const dataDir = path.dirname(AUDIT_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function recordDecision({ requestId, action, decision, analyst, classification }) {
    const entry = {
        timestamp: new Date().toISOString(),
        requestId,
        action,
        decision,
        analyst: analyst || 'unknown',
        riskLevel: classification?.riskLevel,
        confidenceScore: classification?.confidenceScore,
    };

    try {
        fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
        logSOC('INFO', 'AUDIT', `Decision recorded: ${decision} for ${requestId}`);
    } catch (err) {
        logSOC('ERROR', 'AUDIT', `Failed to write audit log: ${err.message}`);
    }
}

function getRecentDecisions(limit = 50) {
    try {
        if (!fs.existsSync(AUDIT_FILE)) return [];
        const lines = fs.readFileSync(AUDIT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
        return lines.slice(-limit).map(line => JSON.parse(line)).reverse();
    } catch (err) {
        logSOC('ERROR', 'AUDIT', `Failed to read audit log: ${err.message}`);
        return [];
    }
}

module.exports = { recordDecision, getRecentDecisions };
