import requests
import os

BASE_URL = os.environ.get("PROXY_URL", "http://localhost:3001")
SECRET = os.environ.get("ADMIN_SECRET", "local_dev_secret")

print("🤖 [AI Agent] Sending safe request: get_weather...")
r = requests.post(
    f"{BASE_URL}/proxy/execute",
    json={"agent_id": "weather-bot", "action": "get_weather", "target": "tel_aviv", "reasoning": "User asked for forecast"},
    headers={"Authorization": f"Bearer {SECRET}", "Content-Type": "application/json"},
    timeout=10
)
print(f"✅ Response: {r.json().get('proxy_action')} ({r.status_code}) — passed through instantly")
