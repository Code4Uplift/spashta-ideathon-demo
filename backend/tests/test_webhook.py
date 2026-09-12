def test_account_aggregator_webhook(client):
    payload = {
        "consent_handle": "AA-CONSENT-789-DEMO",
        "fip_id": "FIP-HDFC-BANK",
        "domain": "rbi",
        "financial_data": {
            "score": 775,
            "loan_amount": 400000,
            "income": 95000,
            "foir": 32,
            "delinquency": 0,
            "emp_status": 2
        }
    }
    response = client.post("/webhook/account-aggregator", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PROCESSED_SUCCESSFULLY"
    assert data["consent_handle"] == "AA-CONSENT-789-DEMO"
    assert data["extracted_parameters"]["score"] == 775.0
    assert data["score_result"]["verdict"] == "CREDIT APPROVED"
    assert "verified_at" in data
