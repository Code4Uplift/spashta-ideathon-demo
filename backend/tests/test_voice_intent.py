from unittest.mock import patch, MagicMock
import httpx
import pytest


def test_voice_intent_heuristic_action(client):
    """Test action command recognition via fallback heuristic."""
    payload = {
        "text": "Please compute the explanations",
        "current_domain": "rbi",
        "language": "en"
    }
    response = client.post("/voice-intent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["action"] == "compute"
    assert "heuristic_fallback" in data["engine"]


def test_voice_intent_heuristic_domain_and_param(client):
    """Test switching domain to SEBI and setting income to 500000 (5 lakh)."""
    payload = {
        "text": "I want to check SEBI, I have 5 lakh rupees income",
        "current_domain": "rbi",
        "language": "en"
    }
    response = client.post("/voice-intent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "sebi"
    assert data["parameters"].get("income") == 500000.0
    assert "SEBI" in data["feedback"]


def test_voice_intent_hindi_cibil(client):
    """Test Hindi / Indic voice input with CIBIL score."""
    payload = {
        "text": "सिबिल स्कोर 750",
        "current_domain": "sebi",
        "language": "hi"
    }
    response = client.post("/voice-intent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "rbi"
    assert data["parameters"].get("score") == 750.0


def test_voice_intent_irdai_policy_vintage(client):
    """Test IRDAI policy vintage input."""
    payload = {
        "text": "Policy vintage 5 years",
        "current_domain": "rbi",
        "language": "en"
    }
    response = client.post("/voice-intent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "irdai"
    assert data["parameters"].get("tenure") == 5.0


def test_voice_intent_nabard_land_holding(client):
    """Test NABARD cultivable land holding."""
    payload = {
        "text": "10 acre zameen farm land",
        "current_domain": "rbi",
        "language": "en"
    }
    response = client.post("/voice-intent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "nabard"
    assert data["parameters"].get("land_holding") == 10.0


def test_voice_intent_ibbi_crore_handling(client):
    """Test IBBI resolution enterprise value in Crores."""
    payload = {
        "text": "Enterprise value 500 crore",
        "current_domain": "rbi",
        "language": "en"
    }
    response = client.post("/voice-intent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["domain"] == "ibbi"
    assert data["parameters"].get("ev_amount") == 500.0


def test_voice_intent_tcet_coe_gateway_success(client, monkeypatch):
    """Test successful TCET CoE DGX Spark Qwen3.6 gateway response."""
    monkeypatch.setenv("COE_AI_KEY", "sk-mock-tcet-key")
    monkeypatch.setenv("COE_AI_BASE_URL", "https://ai.tcetcercd.in/v1")

    mock_llm_json = '{"domain": "sebi", "action": null, "parameters": {"income": 500000}, "feedback": "Switched to SEBI and set Net Worth to ₹5,00,000"}'
    mock_response_data = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": mock_llm_json
                }
            }
        ]
    }

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        payload = {
            "text": "mane SEBI jovu che 5 lakh aavak che",
            "current_domain": "rbi",
            "language": "gu"
        }
        response = client.post("/voice-intent", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["domain"] == "sebi"
        assert data["parameters"].get("income") == 500000.0
        assert data["engine"] == "tcet_coe_qwen3.6"
        assert "SEBI" in data["feedback"]


def test_voice_intent_tcet_coe_gateway_timeout_fallback(client, monkeypatch):
    """Test graceful fallback to heuristic when campus server times out."""
    monkeypatch.setenv("COE_AI_KEY", "sk-mock-tcet-key")

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectTimeout("CoE Campus gateway unreachable")):
        payload = {
            "text": "I want to check SEBI, I have 5 lakh rupees income",
            "current_domain": "rbi",
            "language": "en"
        }
        response = client.post("/voice-intent", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["domain"] == "sebi"
        assert data["parameters"].get("income") == 500000.0
        assert data["engine"] == "heuristic_fallback"
