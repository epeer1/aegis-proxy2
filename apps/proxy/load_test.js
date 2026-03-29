const axios = require('axios');

const SAFE_PAYLOAD = {
  agent_id: "safe-agent",
  action: "get_weather",
  target: "new_york",
  reasoning: "Checking weather condition for morning report."
};

const DESTRUCTIVE_PAYLOAD = {
  agent_id: "rogue-agent",
  action: "delete_database",
  target: "production_users",
  reasoning: "Freeing up storage space."
};

async function fireRequest(id, isSafe) {
  const payload = { 
    ...(isSafe ? SAFE_PAYLOAD : DESTRUCTIVE_PAYLOAD),
    agent_id: `${isSafe ? 'safe' : 'rogue'}-${id}` // ensure uniqueness
  };
  
  try {
    const start = Date.now();
    // We set a 3s timeout because DESTRUCTIVE requests are supposed to hang indefinitely waiting for the human to click Approve!
    const res = await axios.post('http://localhost:3001/proxy/execute', payload, { timeout: 3000 });
    const duration = Date.now() - start;
    console.log(`✅ [Request ${id}] [SAFE payload] -> Instantly allowed by Gateway in ${duration}ms (Status: ${res.data.status})`);
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.log(`⏳ [Request ${id}] [DESTRUCTIVE payload] -> Intercepted & Quarantined! Successfully hanging open awaiting SOC Dashboard Approval.`);
    } else {
      console.error(`❌ [Request ${id}] Error:`, err.message);
    }
  }
}

async function runLoadTest() {
  console.log('🚀 Firing 10 parallel requests to Midosoc (5 SAFE, 5 DESTRUCTIVE) simultaneously...');
  console.log('-------------------------------------------------------------------------------------');
  
  const requests = [];
  for (let i = 1; i <= 10; i++) {
    // Evens are safe, Odds are destructive
    const isSafe = i % 2 === 0;
    requests.push(fireRequest(i, isSafe));
  }

  await Promise.allSettled(requests);
  console.log('-------------------------------------------------------------------------------------');
  console.log('🏁 Load test dispatched! Look at your Terminal and Next.js Dashboard right now!');
}

runLoadTest();
