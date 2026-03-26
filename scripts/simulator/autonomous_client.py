import time
import json
import requests
import sys

PROXY_URL = "http://localhost:3001/proxy/execute"
EXTERNAL_API_URL = "http://localhost:3001/external/execute"

def run_agent_simulation():
    print("🤖 [Autonomous AI Agent] Initializing local tasks...")
    time.sleep(1)
    
    # Task 1: Safe operation
    safe_payload = {
        "agent_id": "nexus-09",
        "action": "get_weather",
        "target": "NYC",
        "reasoning": "Need weather context for daily briefing"
    }
    
    print("\n[AI Agent] Executing Task 1: Check Weather")
    try:
        response = requests.post(PROXY_URL, json=safe_payload)
        print(f"✅ Response from Gateway: {response.json().get('proxy_action')} ({response.status_code})")
    except Exception as e:
        print(f"❌ Failed to reach proxy: {e}")
        sys.exit(1)
        
    time.sleep(2)
    
    # Task 2: Destructive operation
    destructive_payload = {
        "agent_id": "nexus-09",
        "action": "delete_database",
        "target": "legacy_metrics",
        "reasoning": "Clearing up disk space for new metrics"
    }
    
    print("\n[AI Agent] Executing Task 2: Delete legacy metrics database")
    print("⏳ Waiting for network response... (This may require human-in-the-loop authorization!)")
    
    try:
        # We expect this to hang until the SOC analyst approves or denies
        response = requests.post(PROXY_URL, json=destructive_payload, timeout=300)
        
        if response.status_code == 200:
            print("\n🚨 [AI Agent] ACTION APPROVED via Auth0 step-up!")
            vault_token = response.json().get('auth0_vault_delegation')
            print(f"Vault Delegation Token Received: {vault_token[:20]}..." if vault_token and len(vault_token) > 20 else f"Vault Delegation Token Received: {vault_token}")
            
            # Close the Token Vault loop — use the token to call the protected external API
            print("\n[AI Agent] Executing authorized action via External API with vault token...")
            try:
                ext_response = requests.post(
                    EXTERNAL_API_URL,
                    json=destructive_payload,
                    headers={"Authorization": f"Bearer {vault_token}", "Content-Type": "application/json"},
                    timeout=10
                )
                if ext_response.status_code == 200:
                    result = ext_response.json()
                    print(f"✅ Action executed successfully: {result.get('message')}")
                    print(f"   Executed at: {result.get('executedAt')}")
                else:
                    print(f"❌ External API rejected: {ext_response.status_code} - {ext_response.text}")
            except Exception as e:
                print(f"❌ External API call failed: {e}")
        elif response.status_code == 403:
            print("\n❌ [AI Agent] ACTION REJECTED by human SOC analyst.")
        elif response.status_code == 503:
            print("\n⚠️ [AI Agent] Gateway shutting down or overloaded.")
        else:
            print(f"\n⚠️ Unexpected Gateway Response: {response.status_code} - {response.text}")
            
    except requests.exceptions.Timeout:
        print("\n⏰ Gateway Request Timed Out waiting for approval.")
    except requests.exceptions.ChunkedEncodingError:
        print("\n⚠️ Gateway connection severed gracefully.")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    run_agent_simulation()
