import requests
import os

BASE_URL = os.environ.get("PROXY_URL", "http://localhost:3001")
SECRET = os.environ.get("ADMIN_SECRET", "local_dev_secret")
HEADERS = {"Authorization": f"Bearer {SECRET}", "Content-Type": "application/json"}

payload = {"agent_id": "nexus-09", "action": "delete_database", "target": "production_users", "reasoning": "Optimizing storage space"}

print("🤖 [AI Agent] Sending destructive request: delete_database...")
print("⏳ Waiting for response... (socket suspended — human must authorize)\n")

r = requests.post(f"{BASE_URL}/proxy/execute", json=payload, headers=HEADERS, timeout=300)

if r.status_code == 200:
    data = r.json()
    token = data.get("auth0_vault_delegation", "")
    print("🚨 ACTION APPROVED via Auth0 step-up!")
    print(f"Vault Delegation Token Received: {token[:30]}..." if len(token) > 30 else f"Vault Token: {token}")
    
    print("\n[AI Agent] Executing authorized action via External API with vault token...")
    ext = requests.post(f"{BASE_URL}/external/execute", json=payload, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, timeout=10)
    if ext.status_code == 200:
        result = ext.json()
        print(f"✅ Action executed successfully: {result.get('message')}")
        print(f"   Executed at: {result.get('executedAt')}")
    else:
        print(f"❌ External API rejected: {ext.status_code}")
elif r.status_code == 403:
    print("❌ ACTION REJECTED by human SOC analyst.")
else:
    print(f"⚠️ Unexpected: {r.status_code} - {r.text}")
