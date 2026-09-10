def test_verify_certificate_public_and_pii_safe(client, auth_headers):
    # 1. Create a certificate first via protected endpoint
    create_payload = {
        "domain": "irdai",
        "inputs": {
            "tenure": 5,
            "amount": 85000,
            "network": 1,
            "pre_existing": 1,
            "fraud_score": 5
        }
    }
    create_resp = client.post("/certificate", json=create_payload, headers=auth_headers)
    assert create_resp.status_code == 201
    cert_data = create_resp.json()
    cert_id = cert_data["cert_id"]

    # 2. Verify certificate publicly WITHOUT any API key or auth header
    verify_resp = client.get(f"/verify/{cert_id}")
    assert verify_resp.status_code == 200
    public_data = verify_resp.json()

    # 3. Assert Public Fields are accurately returned
    assert public_data["cert_id"] == cert_id
    assert public_data["domain"] == "irdai"
    assert public_data["verdict"] == "CLAIM APPROVED"
    assert public_data["sha256_hash"] == cert_data["sha256_hash"]
    assert "created_at" in public_data

    # 4. Strict PII Boundary Assertion: Private applicant inputs & internal vectors MUST be absent
    assert "inputs" not in public_data, "PII Leak: 'inputs' field found in public verification response"
    assert "coefficients" not in public_data, "Model Leak: 'coefficients' found in public verification response"
    assert "shap_values" not in public_data, "Attribution Leak: 'shap_values' found in public verification response"
    assert "baseline_prob" not in public_data
    assert "full_prob" not in public_data


def test_verify_nonexistent_certificate_returns_404(client):
    response = client.get("/verify/RBI/XAI-CREDIT/2026/NONEXIST01")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
