import { requestJson } from "/shared/api-client.js";
import { getSharedContext, subscribeSharedContext } from "/shared/context-store.js";

function toStatusLabel(result) {
  if (result.status === 0) {
    return "Network error";
  }
  return `${result.ok ? "Success" : "Failed"} · HTTP ${result.status}`;
}

function renderCallResult(target, result) {
  const panel = target.closest(".response-panel");
  if (panel) {
    const status = panel.querySelector(".response-status");
    const trace = panel.querySelector(".response-trace");
    status.textContent = toStatusLabel(result);
    status.classList.toggle("ok", result.ok);
    status.classList.toggle("fail", !result.ok);
    trace.textContent = result.traceId ? `Trace: ${result.traceId}` : "Trace: -";
  }

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

    this.unsubscribeContext = subscribeSharedContext((context) => this.applyContext(context));
    this.applyContext(getSharedContext());
  }

  disconnectedCallback() {
    if (this.unsubscribeContext) {
      this.unsubscribeContext();
      this.unsubscribeContext = null;
    }
  }

  applyContext(context) {
    const userId = context.userId || "";
    const userInput = this.shadowRoot.querySelector("#user-id-input");
    if (userInput) {
      userInput.value = userId;
    }
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
        :host {
          --users-accent: #1d4ed8;
          --users-accent-soft: #eff6ff;
          --border: #d9e2ee;
          --text-main: #0f172a;
          --text-muted: #475569;
          --surface: #ffffff;
          --surface-soft: #f8fafc;
          --response-bg: #0b1220;
          --response-text: #dbe7ff;
          display: block;
          color: var(--text-main);
        }
        :host([data-theme="dark"]) {
          --users-accent: #60a5fa;
          --users-accent-soft: #1e293b;
          --border: #334155;
          --text-main: #e2e8f0;
          --text-muted: #94a3b8;
          --surface: #111827;
          --surface-soft: #0b1220;
          --response-bg: #020617;
          --response-text: #dbeafe;
        }

        .module-grid {
          display: grid;
          gap: 14px;
        }

        .endpoint {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          background: var(--surface);
          display: grid;
          gap: 12px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }
        :host([data-theme="dark"]) .endpoint {
          box-shadow: 0 8px 20px rgba(2, 6, 23, 0.35);
        }

        .endpoint-head {
          display: grid;
          gap: 6px;
        }
        .endpoint-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .method {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          color: #ffffff;
          background: var(--users-accent);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .path {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          background: var(--users-accent-soft);
          color: var(--users-accent);
          border: 1px solid #bfdbfe;
          border-radius: 7px;
          padding: 4px 8px;
        }
        :host([data-theme="dark"]) .path {
          color: #bfdbfe;
          border-color: #334155;
        }
        h3 {
          margin: 0;
          font-size: 18px;
        }
        .help {
          margin: 0;
          color: var(--text-muted);
          font-size: 13px;
        }

        .form-grid {
          display: grid;
          gap: 10px;
        }
        .row {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        }
        .field {
          display: grid;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .field span {
          font-weight: 600;
        }
        input, button {
          font: inherit;
          padding: 10px 11px;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        input {
          background: var(--surface-soft);
          color: var(--text-main);
        }
        input:focus {
          outline: 2px solid #dbeafe;
          outline-offset: 1px;
          border-color: #93c5fd;
          background: var(--surface);
        }
        button {
          background: linear-gradient(145deg, #2563eb, #1d4ed8);
          border-color: #1d4ed8;
          color: #f8fafc;
          cursor: pointer;
          width: fit-content;
          font-weight: 700;
        }
        button:hover {
          background: #1e40af;
          border-color: #1e40af;
        }

        .response-panel {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: #0f172a;
        }
        .response-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          padding: 8px 10px;
          border-bottom: 1px solid #263246;
          background: #111827;
          flex-wrap: wrap;
        }
        :host([data-theme="dark"]) .response-head {
          background: #0b1220;
          border-bottom-color: #334155;
        }
        .response-status {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 3px 8px;
          border: 1px solid #374151;
          color: #cbd5e1;
        }
        .response-status.ok {
          color: #bbf7d0;
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.14);
        }
        .response-status.fail {
          color: #fecaca;
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.16);
        }
        .response-trace {
          font-size: 11px;
          color: #94a3b8;
        }
        pre {
          margin: 0;
          padding: 12px;
          background: var(--response-bg);
          color: var(--response-text);
          overflow: auto;
          max-height: 280px;
          line-height: 1.4;
        }
      </style>
      <div class="module-grid">
        <section class="endpoint">
          <div class="endpoint-head">
            <div class="endpoint-meta">
              <span class="method">POST</span>
              <span class="path">/api/v1/users</span>
            </div>
            <h3>Register user</h3>
            <p class="help">Create a new user and automatically sync generated userId into shared context.</p>
          </div>
          <form id="register-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>Email</span>
                <input name="email" type="email" required placeholder="user@example.com" value="user@example.com" />
              </label>
              <label class="field">
                <span>Full name</span>
                <input name="fullName" type="text" required placeholder="Jane Doe" value="Jane Doe" />
              </label>
              <label class="field">
                <span>Phone</span>
                <input name="phone" type="text" required placeholder="+38640111222" value="+38640111222" />
              </label>
            </div>
            <button type="submit">Register user</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="register-result">No request yet.</pre>
          </div>
        </section>

        <section class="endpoint">
          <div class="endpoint-head">
            <div class="endpoint-meta">
              <span class="method">GET</span>
              <span class="path">/api/v1/users/{userId}</span>
            </div>
            <h3>Fetch user by ID</h3>
            <p class="help">Use an existing ID to verify user status and profile data.</p>
          </div>
          <form id="get-user-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>User ID</span>
                <input id="user-id-input" type="text" required placeholder="Paste userId" />
              </label>
            </div>
            <button type="submit">Get user</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="get-user-result">No request yet.</pre>
          </div>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("users-mfe")) {
  customElements.define("users-mfe", UsersMfe);
}
