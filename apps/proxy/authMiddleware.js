const { createRemoteJWKSet, jwtVerify } = require('jose');
const { logSOC } = require('./logger');

let JWKS;
if (process.env.AUTH0_DOMAIN) {
    JWKS = createRemoteJWKSet(new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`));
}

async function requireAuth0JWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logSOC('WARN', 'AUTH_MIDDLEWARE', 'Rejecting unauthorized request: Missing or invalid Authorization header.');
        return res.status(401).json({ error: 'Unauthorized. Step-up authorization token required.' });
    }

    const token = authHeader.split(' ')[1];

    const adminSecret = process.env.ADMIN_SECRET || 'local_dev_secret';
    if (token === adminSecret) {
        logSOC('INFO', 'AUTH_MIDDLEWARE', 'Authorized via legacy ADMIN_SECRET fallback.');
        return next();
    }

    if (!process.env.AUTH0_DOMAIN) {
        logSOC('ERROR', 'AUTH_MIDDLEWARE', 'Invalid ADMIN_SECRET provided and no Auth0 domain configured.');
        return res.status(401).json({ error: 'Unauthorized. Invalid legacy token.' });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        });
        
        // Expose user info to the route if needed
        req.user = payload;
        logSOC('SUCCESS', 'AUTH_MIDDLEWARE', `Valid Auth0 JWT verified for user: ${payload.sub}`);
        next();
    } catch (err) {
        logSOC('ERROR', 'AUTH_MIDDLEWARE', `JWT Verification failed: ${err.message}`);
        return res.status(401).json({ error: 'Unauthorized. Invalid or expired Auth0 JWT.' });
    }
}

function requirePermission(permission) {
    return (req, res, next) => {
        // Fallback for local development
        if (req.headers.authorization && req.headers.authorization.split(' ')[1] === (process.env.ADMIN_SECRET || 'local_dev_secret')) {
             return next();
        }

        const permissions = req.user?.permissions || [];
        if (!permissions.includes(permission)) {
            logSOC('WARN', 'RBAC', `User ${req.user?.sub} missing required explicit permission: ${permission}`);
            return res.status(403).json({ error: `Forbidden. Requires permission: ${permission}` });
        }
        next();
    };
}

module.exports = { requireAuth0JWT, requirePermission };
