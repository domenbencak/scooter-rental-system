from uuid import uuid4


def test_post_users_success(client):
    payload = {
        "email": "api-success@example.com",
        "fullName": "Jane Doe",
        "phone": "+38640111222",
    }

    response = client.post("/api/v1/users", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == payload["email"]
    assert body["fullName"] == payload["fullName"]
    assert "userId" in body
    assert "createdAt" in body


def test_post_users_validation_failure(client):
    payload = {
        "email": "not-an-email",
        "fullName": "A",
        "phone": "12",
    }

    response = client.post("/api/v1/users", json=payload)

    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "VALIDATION_ERROR"
    assert body["traceId"] is not None


def test_post_users_duplicate_email(client):
    payload = {
        "email": "duplicate@example.com",
        "fullName": "Jane Doe",
        "phone": "+38640111222",
    }

    first = client.post("/api/v1/users", json=payload)
    second = client.post("/api/v1/users", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"] == "CONFLICT"


def test_get_user_success(client):
    payload = {
        "email": "get-success@example.com",
        "fullName": "John Doe",
        "phone": "+38640112222",
    }
    created = client.post("/api/v1/users", json=payload)
    user_id = created.json()["userId"]

    response = client.get(f"/api/v1/users/{user_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["userId"] == user_id
    assert body["status"] == "ACTIVE"


def test_get_user_not_found(client):
    response = client.get(f"/api/v1/users/{uuid4()}")

    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "RESOURCE_NOT_FOUND"
    assert body["traceId"] is not None
