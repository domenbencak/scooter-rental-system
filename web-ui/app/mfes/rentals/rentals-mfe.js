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

class RentalsMfe extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();

    this.shadowRoot.querySelector("#start-rental-form").addEventListener("submit", (event) => this.startRental(event));
    this.shadowRoot.querySelector("#end-rental-form").addEventListener("submit", (event) => this.endRental(event));
    this.shadowRoot.querySelector("#active-rentals-form").addEventListener("submit", (event) => this.getActiveRentals(event));

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
    const scooterId = context.scooterId || "";
    const rentalId = context.rentalId || "";

    const startUserInput = this.shadowRoot.querySelector("#start-user-id");
    const activeUserInput = this.shadowRoot.querySelector("#active-user-id");
    const startScooterInput = this.shadowRoot.querySelector("#start-scooter-id");
    const endRentalInput = this.shadowRoot.querySelector("#end-rental-id");

    if (startUserInput) {
      startUserInput.value = userId;
    }
    if (activeUserInput) {
      activeUserInput.value = userId;
    }
    if (startScooterInput) {
      startScooterInput.value = scooterId || "SCOOTER-1";
    }
    if (endRentalInput) {
      endRentalInput.value = rentalId;
    }
  }

  async startRental(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      userId: String(data.get("userId") || ""),
      scooterId: String(data.get("scooterId") || ""),
      startLocation: {
        lat: Number(data.get("lat")),
        lon: Number(data.get("lon")),
      },
    };

    const result = await requestJson("/api/v1/rentals/start", {
      method: "POST",
      body: payload,
    });
    renderCallResult(this.shadowRoot.querySelector("#start-rental-result"), result);

    if (result.ok && result.data?.rentalId) {
      window.dispatchEvent(
        new CustomEvent("scooter:rental-selected", {
          detail: { rentalId: result.data.rentalId },
        }),
      );
      this.shadowRoot.querySelector("#end-rental-id").value = result.data.rentalId;
    }
  }

  async endRental(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rentalId = String(data.get("rentalId") || "");
    const payload = {
      endLocation: {
        lat: Number(data.get("lat")),
        lon: Number(data.get("lon")),
      },
      batteryLevel: Number(data.get("batteryLevel")),
    };

    const result = await requestJson(`/api/v1/rentals/${encodeURIComponent(rentalId)}/end`, {
      method: "POST",
      body: payload,
    });
    renderCallResult(this.shadowRoot.querySelector("#end-rental-result"), result);
  }

  async getActiveRentals(event) {
    event.preventDefault();
    const userId = this.shadowRoot.querySelector("#active-user-id").value.trim();
    const result = await requestJson(`/api/v1/rentals/active?userId=${encodeURIComponent(userId)}`);
    renderCallResult(this.shadowRoot.querySelector("#active-rentals-result"), result);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --rentals-accent: #c2410c;
          --rentals-accent-soft: #fff7ed;
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
          --rentals-accent: #fb923c;
          --rentals-accent-soft: #292524;
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
          background: var(--rentals-accent);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .path {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          background: var(--rentals-accent-soft);
          color: #92400e;
          border: 1px solid #fdba74;
          border-radius: 7px;
          padding: 4px 8px;
        }
        :host([data-theme="dark"]) .path {
          color: #fdba74;
          border-color: #4b5563;
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
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
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
          outline: 2px solid #ffedd5;
          outline-offset: 1px;
          border-color: #f59e0b;
          background: var(--surface);
        }
        button {
          background: linear-gradient(145deg, #ea580c, #c2410c);
          border-color: #c2410c;
          color: #fffefb;
          cursor: pointer;
          width: fit-content;
          font-weight: 700;
        }
        button:hover {
          background: #92400e;
          border-color: #92400e;
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
              <span class="path">/api/v1/rentals/start</span>
            </div>
            <h3>Start rental</h3>
            <p class="help">Start a ride and sync returned rentalId into shared session context.</p>
          </div>
          <form id="start-rental-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>User ID</span>
                <input id="start-user-id" name="userId" type="text" required placeholder="Paste userId" />
              </label>
              <label class="field">
                <span>Scooter ID</span>
                <input id="start-scooter-id" name="scooterId" type="text" required placeholder="SCOOTER-1" value="SCOOTER-1" />
              </label>
              <label class="field">
                <span>Start latitude</span>
                <input name="lat" type="number" step="any" required placeholder="46.5547" value="46.5547" />
              </label>
              <label class="field">
                <span>Start longitude</span>
                <input name="lon" type="number" step="any" required placeholder="15.6459" value="15.6459" />
              </label>
            </div>
            <button type="submit">Start rental</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="start-rental-result">No request yet.</pre>
          </div>
        </section>

        <section class="endpoint">
          <div class="endpoint-head">
            <div class="endpoint-meta">
              <span class="method">POST</span>
              <span class="path">/api/v1/rentals/{rentalId}/end</span>
            </div>
            <h3>End rental</h3>
            <p class="help">Finish an active ride and update final location and battery level.</p>
          </div>
          <form id="end-rental-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>Rental ID</span>
                <input id="end-rental-id" name="rentalId" type="text" required placeholder="Paste rentalId" />
              </label>
              <label class="field">
                <span>End latitude</span>
                <input name="lat" type="number" step="any" required placeholder="46.5601" value="46.5601" />
              </label>
              <label class="field">
                <span>End longitude</span>
                <input name="lon" type="number" step="any" required placeholder="15.65" value="15.65" />
              </label>
              <label class="field">
                <span>Battery level (0-100)</span>
                <input name="batteryLevel" type="number" min="0" max="100" required placeholder="75" value="75" />
              </label>
            </div>
            <button type="submit">End rental</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="end-rental-result">No request yet.</pre>
          </div>
        </section>

        <section class="endpoint">
          <div class="endpoint-head">
            <div class="endpoint-meta">
              <span class="method">GET</span>
              <span class="path">/api/v1/rentals/active?userId=...</span>
            </div>
            <h3>Inspect active rentals</h3>
            <p class="help">Check if the selected user currently has active ride sessions.</p>
          </div>
          <form id="active-rentals-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>User ID</span>
                <input id="active-user-id" type="text" required placeholder="Paste userId" />
              </label>
            </div>
            <button type="submit">Get active rentals</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="active-rentals-result">No request yet.</pre>
          </div>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("rentals-mfe")) {
  customElements.define("rentals-mfe", RentalsMfe);
}
