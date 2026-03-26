const crypto = require('crypto');
const { EventEmitter } = require('events');
const { logSOC } = require('./logger');

class QueueManager extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.MAX_QUEUE_SIZE = 100;
        this.TTL_MS = 5 * 60 * 1000; // 5 minutes

        // Setup periodic cleanup of stale requests
        setInterval(() => this.cleanup(), 60 * 1000); // Check every minute
    }

    add(payload, classification, resolver) {
        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            logSOC('ERROR', 'QUEUE', `Queue at max capacity (${this.MAX_QUEUE_SIZE}). Rejecting request.`);
            return null;
        }

        const id = crypto.randomUUID();
        const pendingRequest = {
            id,
            payload,
            status: 'PENDING_HUMAN_STEP_UP_AUTH',
            classification,
            timestamp: Date.now(),
            resolver
        };

        this.queue.push(pendingRequest);
        this.emit('request:added', { id, payload, classification, timestamp: pendingRequest.timestamp });
        return id;
    }

    find(id) {
        return this.queue.find(r => r.id === id);
    }

    getAll() {
        return this.queue.map(req => ({
            id: req.id,
            payload: req.payload,
            status: req.status,
            classification: req.classification,
            timestamp: req.timestamp
        }));
    }

    size() {
        return this.queue.length;
    }

    approve(id) {
        const index = this.queue.findIndex(r => r.id === id);
        if (index === -1) return null;
        
        const req = this.queue[index];
        this.queue.splice(index, 1);
        this.emit('request:approved', { id });
        return req;
    }

    deny(id) {
        const index = this.queue.findIndex(r => r.id === id);
        if (index === -1) return null;
        
        const req = this.queue[index];
        this.queue.splice(index, 1);
        this.emit('request:denied', { id });
        return req;
    }

    cleanup() {
        const now = Date.now();
        const initialSize = this.queue.length;
        
        this.queue = this.queue.filter(req => {
            if (now - req.timestamp > this.TTL_MS) {
                logSOC('WARN', 'QUEUE', `Request ${req.id} expired due to TTL. Auto-denying.`);
                if (req.resolver && !req.resolver.headersSent) {
                    req.resolver.status(408).json({
                        status: 'blocked',
                        proxy_action: 'timeout',
                        message: 'Request expired waiting for step-up authorization.'
                    });
                }
                return false;
            }
            return true;
        });

        if (initialSize !== this.queue.length) {
            logSOC('INFO', 'QUEUE', `Cleaned up ${initialSize - this.queue.length} expired requests. New queue size: ${this.queue.length}`);
        }
    }
}

// Export a singleton instance
const queueManager = new QueueManager();
module.exports = { queueManager, QueueManager };
