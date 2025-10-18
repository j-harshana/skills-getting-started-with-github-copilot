from fastapi.testclient import TestClient
from src import app

client = TestClient(app.app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Chess Club exists in sample data
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "teststudent@mergington.edu"

    # ensure clean state: if present, unregister first
    client.post(f"/activities/{activity}/unregister?email={email}")

    # signup
    signup_resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert signup_resp.status_code == 200
    assert "Signed up" in signup_resp.json().get("message", "")

    # verify participant present
    activities = client.get("/activities").json()
    assert email in activities[activity]["participants"]

    # unregister
    unregister_resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert unregister_resp.status_code == 200
    assert "Unregistered" in unregister_resp.json().get("message", "")

    # verify participant removed
    activities_after = client.get("/activities").json()
    assert email not in activities_after[activity]["participants"]


def test_unregistered_errors():
    activity = "Nonexistent Activity"
    # unregistering from non-existent activity should 404
    resp = client.post(f"/activities/{activity}/unregister?email=foo@bar.com")
    assert resp.status_code == 404

    # unregistering email not in activity should return 400
    resp2 = client.post(f"/activities/Chess%20Club/unregister?email=notpresent@mergington.edu")
    assert resp2.status_code == 400
