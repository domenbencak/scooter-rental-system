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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderScootersList(target, items) {
  if (!Array.isArray(items) || items.length === 0) {
    target.innerHTML = `<div class="empty-list">No available scooters in this area.</div>`;
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Scooter</th>
            <th>Status</th>
            <th>Battery</th>
            <th>Location</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td><strong>${escapeHtml(item.scooterId)}</strong></td>
              <td><span class="status-pill">${escapeHtml(item.status)}</span></td>
              <td>${escapeHtml(item.batteryLevel)}%</td>
              <td>${escapeHtml(item.location?.lat)}, ${escapeHtml(item.location?.lon)}</td>
              <td><button type="button" data-scooter-id="${escapeHtml(item.scooterId)}" class="use-scooter-button">Select</button></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

class ScootersMfe extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.shadowRoot
      .querySelector("#available-scooters-form")
      .addEventListener("submit", (event) => this.getAvailableScooters(event));
    this.shadowRoot
      .querySelector("#update-scooter-form")
      .addEventListener("submit", (event) => this.updateScooterStatus(event));

    this.shadowRoot.addEventListener("click", (event) => {
      const button = event.target.closest(".use-scooter-button");
      if (!button) {
        return;
      }
      const scooterId = button.getAttribute("data-scooter-id");
      if (!scooterId) {
        return;
      }
      this.shadowRoot.querySelector("#update-scooter-id").value = scooterId;
      window.dispatchEvent(new CustomEvent("scooter:scooter-selected", { detail: { scooterId } }));
    });

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
    const scooterId = context.scooterId || "";
    const input = this.shadowRoot.querySelector("#update-scooter-id");
    if (input) {
      input.value = scooterId || "SCOOTER-1";
    }
  }

  async getAvailableScooters(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lat = Number(data.get("lat"));
    const lon = Number(data.get("lon"));
    const radiusMeters = Number(data.get("radiusMeters"));

    const result = await requestJson(
      `/api/v1/scooters/available?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radiusMeters=${encodeURIComponent(radiusMeters)}`,
    );

    renderCallResult(this.shadowRoot.querySelector("#available-scooters-result"), result);
    renderScootersList(this.shadowRoot.querySelector("#available-scooters-list"), result.data?.items || []);
  }

  async updateScooterStatus(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const scooterId = String(data.get("scooterId") || "");
    const payload = {
      status: String(data.get("status") || ""),
      batteryLevel: Number(data.get("batteryLevel")),
      location: {
        lat: Number(data.get("lat")),
        lon: Number(data.get("lon")),
      },
    };

    const result = await requestJson(`/api/v1/scooters/${encodeURIComponent(scooterId)}/status`, {
      method: "PATCH",
      body: payload,
    });

    renderCallResult(this.shadowRoot.querySelector("#update-scooter-result"), result);

    if (result.ok && result.data?.scooterId) {
      window.dispatchEvent(
        new CustomEvent("scooter:scooter-selected", {
          detail: { scooterId: result.data.scooterId },
        }),
      );
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --scooters-accent: #0f766e;
          --scooters-accent-soft: #ecfdf5;
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
          --scooters-accent: #34d399;
          --scooters-accent-soft: #1f2937;
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
          background: var(--scooters-accent);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .path {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          background: var(--scooters-accent-soft);
          color: #047857;
          border: 1px solid #86efac;
          border-radius: 7px;
          padding: 4px 8px;
        }
        :host([data-theme="dark"]) .path {
          color: #86efac;
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
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
        input, button, select {
          font: inherit;
          padding: 10px 11px;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        input, select {
          background: var(--surface-soft);
          color: var(--text-main);
        }
        input:focus, select:focus {
          outline: 2px solid #99f6e4;
          outline-offset: 1px;
          border-color: #14b8a6;
          background: var(--surface);
        }
        button {
          background: linear-gradient(145deg, #0f766e, #0f5f5a);
          border-color: #0f5f5a;
          color: #f8fffd;
          cursor: pointer;
          width: fit-content;
          font-weight: 700;
        }
        button:hover {
          background: #0f5f5a;
          border-color: #0f5f5a;
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
        .empty-list {
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 12px;
          background: #f8fafc;
          color: #64748b;
          font-size: 13px;
        }
        :host([data-theme="dark"]) .empty-list {
          border-color: #334155;
          background: #0b1220;
          color: #94a3b8;
        }
        .table-wrap {
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 620px;
          font-size: 14px;
          background: #ffffff;
        }
        :host([data-theme="dark"]) table {
          background: #0b1220;
        }
        thead th {
          background: #f8fafc;
          color: #334155;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          border-bottom: 1px solid var(--border);
        }
        :host([data-theme="dark"]) thead th {
          background: #111827;
          color: #94a3b8;
        }
        th, td {
          padding: 9px 10px;
          text-align: left;
          vertical-align: top;
          border-bottom: 1px solid #edf2f7;
        }
        :host([data-theme="dark"]) th,
        :host([data-theme="dark"]) td {
          border-bottom-color: #1f2937;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .status-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #065f46;
          background: #d1fae5;
          border: 1px solid #86efac;
          border-radius: 999px;
          padding: 3px 8px;
        }
        :host([data-theme="dark"]) .status-pill {
          background: #064e3b;
          border-color: #065f46;
          color: #a7f3d0;
        }
        .use-scooter-button {
          background: #0f172a;
          border-color: #0f172a;
          font-size: 12px;
          padding: 6px 9px;
          border-radius: 8px;
        }
        :host([data-theme="dark"]) .use-scooter-button {
          background: #1e293b;
          border-color: #334155;
          color: #e2e8f0;
        }
      </style>
      <div class="module-grid">
        <section class="endpoint">
          <div class="endpoint-head">
            <div class="endpoint-meta">
              <span class="method">GET</span>
              <span class="path">/api/v1/scooters/available</span>
            </div>
            <h3>Query nearby scooters</h3>
            <p class="help">Find currently available scooters around a location and transfer one into context.</p>
          </div>
          <form id="available-scooters-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>Latitude</span>
                <input name="lat" type="number" step="any" required placeholder="46.5547" value="46.5547" />
              </label>
              <label class="field">
                <span>Longitude</span>
                <input name="lon" type="number" step="any" required placeholder="15.6459" value="15.6459" />
              </label>
              <label class="field">
                <span>Radius (meters)</span>
                <input name="radiusMeters" type="number" min="1" required placeholder="500" value="500" />
              </label>
            </div>
            <button type="submit">Get available scooters</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="available-scooters-result">No request yet.</pre>
          </div>
          <div id="available-scooters-list"></div>
        </section>

        <section class="endpoint">
          <div class="endpoint-head">
            <div class="endpoint-meta">
              <span class="method">PATCH</span>
              <span class="path">/api/v1/scooters/{scooterId}/status</span>
            </div>
            <h3>Update scooter status</h3>
            <p class="help">Set operational state, battery level and latest location for a scooter.</p>
          </div>
          <form id="update-scooter-form" class="form-grid">
            <div class="row">
              <label class="field">
                <span>Scooter ID</span>
                <input id="update-scooter-id" name="scooterId" type="text" required placeholder="SCOOTER-1" value="SCOOTER-1" />
              </label>
              <label class="field">
                <span>Status</span>
                <select name="status" required>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RENTED">RENTED</option>
                  <option value="CHARGING">CHARGING</option>
                  <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                </select>
              </label>
              <label class="field">
                <span>Battery level (0-100)</span>
                <input name="batteryLevel" type="number" min="0" max="100" required placeholder="80" value="80" />
              </label>
              <label class="field">
                <span>Latitude</span>
                <input name="lat" type="number" step="any" required placeholder="46.5547" value="46.5547" />
              </label>
              <label class="field">
                <span>Longitude</span>
                <input name="lon" type="number" step="any" required placeholder="15.6459" value="15.6459" />
              </label>
            </div>
            <button type="submit">Update scooter status</button>
          </form>
          <div class="response-panel">
            <div class="response-head">
              <span class="response-status">No request yet</span>
              <span class="response-trace">Trace: -</span>
            </div>
            <pre id="update-scooter-result">No request yet.</pre>
          </div>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("scooters-mfe")) {
  customElements.define("scooters-mfe", ScootersMfe);
}
