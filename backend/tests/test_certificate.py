import re


def test_certificate_requires_auth(client):
    payload = {
        "domain": "rbi",
        "inputs": {"score": 790}
    }
    response = client.post("/certificate", json=payload)
    assert response.status_code == 401


def test_certificate_create_success(client, auth_headers):
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
    response = client.post("/certificate", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()

    assert data["domain"] == "rbi"
    assert data["verdict"] == "CREDIT APPROVED"
    assert data["cert_id"].startswith("RBI/XAI-CREDIT/2026/")
    assert len(data["sha256_hash"]) == 64
    assert bool(re.match(r"^[A-F0-9]{64}$", data["sha256_hash"]))
    assert "created_at" in data


def test_certificate_deterministic_hash(client, auth_headers):
    payload = {
        "domain": "sebi",
        "inputs": {
            "risk_appetite": 75,
            "income": 1800000,
            "concentration": 25,
            "horizon": 8,
            "risk_category": 3
        }
    }
    res1 = client.post("/certificate", json=payload, headers=auth_headers)
    res2 = client.post("/certificate", json=payload, headers=auth_headers)

    assert res1.status_code in (200, 201)
    assert res2.status_code in (200, 201)
    assert res1.json()["cert_id"] == res2.json()["cert_id"]
    assert res1.json()["sha256_hash"] == res2.json()["sha256_hash"]
