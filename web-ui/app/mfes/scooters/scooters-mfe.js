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
    target.innerHTML = "<p>No available scooters in this area.</p>";
    return;
  }

  target.innerHTML = `
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
            <td>${escapeHtml(item.scooterId)}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.batteryLevel)}%</td>
            <td>${escapeHtml(item.location?.lat)}, ${escapeHtml(item.location?.lon)}</td>
            <td><button type="button" data-scooter-id="${escapeHtml(item.scooterId)}" class="use-scooter-button">Use scooter</button></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
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

    this.onScooterSelected = (event) => {
      const scooterId = event.detail?.scooterId;
      if (!scooterId) {
        return;
      }
      this.shadowRoot.querySelector("#update-scooter-id").value = scooterId;
    };
    window.addEventListener("scooter:scooter-selected", this.onScooterSelected);
  }

  disconnectedCallback() {
    window.removeEventListener("scooter:scooter-selected", this.onScooterSelected);
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
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        input, button, select {
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
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
      </style>
      <div class="grid">
        <section class="card">
          <h3>GET /api/v1/scooters/available</h3>
          <form id="available-scooters-form" class="grid">
            <div class="row">
              <input name="lat" type="number" step="any" required placeholder="lat" value="46.5547" />
              <input name="lon" type="number" step="any" required placeholder="lon" value="15.6459" />
              <input name="radiusMeters" type="number" min="1" required placeholder="radiusMeters" value="500" />
            </div>
            <button type="submit">Get available scooters</button>
          </form>
          <pre id="available-scooters-result">No request yet.</pre>
          <div id="available-scooters-list"></div>
        </section>

        <section class="card">
          <h3>PATCH /api/v1/scooters/{scooterId}/status</h3>
          <form id="update-scooter-form" class="grid">
            <div class="row">
              <input id="update-scooter-id" name="scooterId" type="text" required placeholder="scooterId" value="SCOOTER-1" />
              <select name="status" required>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RENTED">RENTED</option>
                <option value="CHARGING">CHARGING</option>
                <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
              </select>
              <input name="batteryLevel" type="number" min="0" max="100" required placeholder="batteryLevel" value="80" />
              <input name="lat" type="number" step="any" required placeholder="lat" value="46.5547" />
              <input name="lon" type="number" step="any" required placeholder="lon" value="15.6459" />
            </div>
            <button type="submit">Update scooter status</button>
          </form>
          <pre id="update-scooter-result">No request yet.</pre>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("scooters-mfe")) {
  customElements.define("scooters-mfe", ScootersMfe);
}
