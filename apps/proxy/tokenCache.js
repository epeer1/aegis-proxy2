const axios = require('axios');
const { logSOC } = require('./logger');

let cachedToken = null;
let tokenExpiration = 0;

async function getVaultToken() {
    // Re-use cached token if still valid (5-minute grace period threshold to prevent inflight aborts)
    if (cachedToken && Date.now() < tokenExpiration - 300000) {
        logSOC('INFO', 'AUTH0_VAULT', 'Reused securely cached valid M2M token rather than pinging Auth0 APIs.');
        return cachedToken;
    }

    if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_CLIENT_SECRET) {
         logSOC('ERROR', 'AUTH0_VAULT', 'Missing critical Auth0 environment variables! Cannot acquire vault token.');
         return 'unauthorized_fallback_lock';
    }

    logSOC('INFO', 'AUTH0_VAULT', `Requesting fresh M2M vault token from Auth0 tenant: ${process.env.AUTH0_DOMAIN}`);
    try {
        const authResponse = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
            grant_type: "client_credentials"
        }, { timeout: 5000 });

        cachedToken = authResponse.data.access_token;
        // tokenExpiration is current timestamp + expires_in (seconds) * 1000
        tokenExpiration = Date.now() + (authResponse.data.expires_in * 1000);
        
        logSOC('SUCCESS', 'AUTH0_VAULT', `Acquired fresh vault token from Auth0 successfully.`);
        return cachedToken;
    } catch (error) {
        logSOC('ERROR', 'AUTH0_VAULT', `Failed to acquire vault token: ${error.message}`);
        return 'unauthorized_fallback_lock';
    }
}

module.exports = { getVaultToken };
