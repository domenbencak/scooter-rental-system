import { requestJson } from "/shared/api-client.js";

function renderCallResult(target, result) {
  target.textContent = JSON.stringify(
    {
      ok: result.ok,
      status: result.status,
      traceId: result.traceId,
      error: result.error,
      body: result.data,
    },
    null,
    2,
  );
}

class UsersMfe extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector("#register-form").addEventListener("submit", (event) => this.registerUser(event));
    this.shadowRoot.querySelector("#get-user-form").addEventListener("submit", (event) => this.getUser(event));
  }

  async registerUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      email: String(data.get("email") || ""),
      fullName: String(data.get("fullName") || ""),
      phone: String(data.get("phone") || ""),
    };

    const result = await requestJson("/api/v1/users", {
      method: "POST",
      body: payload,
    });
    renderCallResult(this.shadowRoot.querySelector("#register-result"), result);

    if (result.ok && result.data?.userId) {
      window.dispatchEvent(
        new CustomEvent("scooter:user-selected", {
          detail: { userId: result.data.userId },
        }),
      );
      this.shadowRoot.querySelector("#user-id-input").value = result.data.userId;
    }
  }

  async getUser(event) {
    event.preventDefault();
    const userId = this.shadowRoot.querySelector("#user-id-input").value.trim();
    const result = await requestJson(`/api/v1/users/${encodeURIComponent(userId)}`);
    renderCallResult(this.shadowRoot.querySelector("#get-user-result"), result);

    if (result.ok && result.data?.userId) {
      window.dispatchEvent(
        new CustomEvent("scooter:user-selected", {
          detail: { userId: result.data.userId },
        }),
      );
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .grid {
          display: grid;
          gap: 14px;
        }
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          display: grid;
          gap: 8px;
        }
        .row {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        input, button {
          font: inherit;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
        }
        button {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
          cursor: pointer;
          width: fit-content;
        }
        pre {
          margin: 0;
          padding: 12px;
          border-radius: 8px;
          background: #111827;
          color: #f9fafb;
          overflow: auto;
          max-height: 280px;
        }
      </style>
      <div class="grid">
        <section class="card">
          <h3>POST /api/v1/users</h3>
          <form id="register-form" class="grid">
            <div class="row">
              <input name="email" type="email" required placeholder="email" value="user@example.com" />
              <input name="fullName" type="text" required placeholder="fullName" value="Jane Doe" />
              <input name="phone" type="text" required placeholder="phone" value="+38640111222" />
            </div>
            <button type="submit">Register user</button>
          </form>
          <pre id="register-result">No request yet.</pre>
        </section>

        <section class="card">
          <h3>GET /api/v1/users/{userId}</h3>
          <form id="get-user-form" class="grid">
            <div class="row">
              <input id="user-id-input" type="text" required placeholder="userId" />
            </div>
            <button type="submit">Get user</button>
          </form>
          <pre id="get-user-result">No request yet.</pre>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("users-mfe")) {
  customElements.define("users-mfe", UsersMfe);
}
