import pytest


def test_score_requires_auth(client):
    payload = {
        "domain": "rbi",
        "inputs": {
            "score": 790,
            "loan_amount": 300000,
            "income": 120000,
            "foir": 25,
            "delinquency": 0,
            "emp_status": 2
        }
    }
    response = client.post("/score", json=payload)
    assert response.status_code == 401


def test_score_invalid_auth(client):
    payload = {
        "domain": "rbi",
        "inputs": {
            "score": 790,
            "loan_amount": 300000,
            "income": 120000,
            "foir": 25,
            "delinquency": 0,
            "emp_status": 2
        }
    }
    response = client.post("/score", json=payload, headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 401


def test_score_rbi_valid(client, auth_headers):
    payload = {
        "domain": "rbi",
        "inputs": {
            "score": 790,
            "loan_amount": 300000,
            "income": 120000,
            "foir": 25,
            "delinquency": 0,
            "emp_status": 2
        }
    }
    response = client.post("/score", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["domain"] == "rbi"
    assert data["verdict"] == "CREDIT APPROVED"
    assert data["decided"] is True
    assert data["full_prob"] > data["baseline_prob"]
    assert len(data["shap_values"]) == 6
    assert len(data["factor_breakdown"]) == 6

    # Mathematical Verification: Aumann-Shapley Efficiency Axiom
    shap_sum = sum(data["shap_values"])
    prob_delta = data["full_prob"] - data["baseline_prob"]
    assert abs(shap_sum - prob_delta) < 1e-6, f"Efficiency axiom violated: sum(phi)={shap_sum}, delta_prob={prob_delta}"


def test_score_out_of_range_input(client, auth_headers):
    payload = {
        "domain": "rbi",
        "inputs": {
            "score": 1500  # CIBIL max is 900
        }
    }
    response = client.post("/score", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_score_invalid_domain(client, auth_headers):
    payload = {
        "domain": "crypto_lending",
        "inputs": {}
    }
    response = client.post("/score", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_score_irdai_and_sebi(client, auth_headers):
    # IRDAI Test
    irdai_payload = {
        "domain": "irdai",
        "inputs": {
            "tenure": 5,
            "amount": 85000,
            "network": 1,
            "pre_existing": 1,
            "fraud_score": 5
        }
    }
    resp_irdai = client.post("/score", json=irdai_payload, headers=auth_headers)
    assert resp_irdai.status_code == 200
    data_irdai = resp_irdai.json()
    assert data_irdai["verdict"] == "CLAIM APPROVED"
    assert abs(sum(data_irdai["shap_values"]) - (data_irdai["full_prob"] - data_irdai["baseline_prob"])) < 1e-6

    # SEBI Test
    sebi_payload = {
        "domain": "sebi",
        "inputs": {
            "risk_appetite": 75,
            "income": 1800000,
            "concentration": 25,
            "horizon": 8,
            "risk_category": 3
        }
    }
    resp_sebi = client.post("/score", json=sebi_payload, headers=auth_headers)
    assert resp_sebi.status_code == 200
    data_sebi = resp_sebi.json()
    assert data_sebi["verdict"] == "PRODUCT SUITABLE"
    assert abs(sum(data_sebi["shap_values"]) - (data_sebi["full_prob"] - data_sebi["baseline_prob"])) < 1e-6
