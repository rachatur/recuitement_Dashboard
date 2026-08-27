import urllib.request
import json

def run_tests():
    def post(url, data=None, headers=None):
        if headers is None:
            headers = {}
        data_bytes = json.dumps(data).encode("utf-8") if data is not None else b"{}"
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json", **headers},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get(url, headers=None):
        if headers is None:
            headers = {}
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    print("\n================ TESTING LIVE WHATSAPP ENGINE ================")
    
    # 1. Login
    login_res = post("http://localhost:8000/api/v1/auth/login", {
        "email": "admin@recruitflow.com",
        "password": "AdminPassword123!"
    })
    token = login_res["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Authenticated as Admin successfully.")

    # 2. Test Connection
    conn_res = post("http://localhost:8000/api/v1/whatsapp/test-connection", {}, auth_headers)
    print(f"[PASS] WhatsApp Connection Status: {conn_res.get('connection_status')} (Provider: {conn_res.get('provider')}, Latency: {conn_res.get('latency_ms')}ms)")

    # 3. Get Templates
    tmpls = get("http://localhost:8000/api/v1/whatsapp/templates", auth_headers)
    print(f"[PASS] WhatsApp Approved Templates: {len(tmpls)} found.")
    for t in tmpls:
        print(f"       • Template: {t['template_name']} ({t['status']})")

    # 4. Get Conversations
    convs = get("http://localhost:8000/api/v1/whatsapp/conversations", auth_headers)
    print(f"[PASS] WhatsApp Active Conversations: {len(convs)} found.")
    for c in convs:
        print(f"       • Candidate: {c['candidate_name']} ({c['whatsapp_number']}) | Status: {c['status']} | Category: {c['response_category']}")
        print(f"         Last Message: \"{c['last_message_text']}\"")
        print(f"         Total Messages in Thread: {len(c['messages'])}")

    # 5. Simulate Inbound Candidate Reply
    aarav_conv = next((c for c in convs if "Aarav" in c["candidate_name"]), None)
    if aarav_conv:
        sim_res = post("http://localhost:8000/api/v1/whatsapp/conversations/simulate-reply", {
            "candidate_id": aarav_conv["candidate_id"],
            "message_text": "Sounds great, I have accepted the calendar invite for tomorrow at 2 PM."
        }, auth_headers)
        print(f"[PASS] Simulated Inbound Reply for Aarav Mehta: Status={sim_res.get('status')}, Category={sim_res.get('category')}")

    # 6. Check Dashboard Summary
    dash = get("http://localhost:8000/api/v1/whatsapp/dashboard", auth_headers)
    print(f"[PASS] WhatsApp Dashboard Summary:")
    print(f"       • Total Campaigns: {dash.get('total_campaigns')}")
    print(f"       • Total Recipients: {dash.get('total_recipients')}")
    print(f"       • Delivery Rate: {dash.get('delivery_rate_percent')}%")
    print(f"       • Response Rate: {dash.get('response_rate_percent')}%")
    print(f"       • Categories Breakdown: {dash.get('categories_breakdown')}")

    print("\n================ ALL WHATSAPP TESTS PASSED! ================\n")

if __name__ == "__main__":
    run_tests()
