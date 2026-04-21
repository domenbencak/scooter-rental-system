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

    this.onUserSelected = (event) => {
      const userId = event.detail?.userId;
      if (!userId) {
        return;
      }
      this.shadowRoot.querySelector("#start-user-id").value = userId;
      this.shadowRoot.querySelector("#active-user-id").value = userId;
    };
    this.onScooterSelected = (event) => {
      const scooterId = event.detail?.scooterId;
      if (!scooterId) {
        return;
      }
      this.shadowRoot.querySelector("#start-scooter-id").value = scooterId;
    };
    this.onRentalSelected = (event) => {
      const rentalId = event.detail?.rentalId;
      if (!rentalId) {
        return;
      }
      this.shadowRoot.querySelector("#end-rental-id").value = rentalId;
    };

    window.addEventListener("scooter:user-selected", this.onUserSelected);
    window.addEventListener("scooter:scooter-selected", this.onScooterSelected);
    window.addEventListener("scooter:rental-selected", this.onRentalSelected);
  }

  disconnectedCallback() {
    window.removeEventListener("scooter:user-selected", this.onUserSelected);
    window.removeEventListener("scooter:scooter-selected", this.onScooterSelected);
    window.removeEventListener("scooter:rental-selected", this.onRentalSelected);
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
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
          <h3>POST /api/v1/rentals/start</h3>
          <form id="start-rental-form" class="grid">
            <div class="row">
              <input id="start-user-id" name="userId" type="text" required placeholder="userId" />
              <input id="start-scooter-id" name="scooterId" type="text" required placeholder="scooterId" value="SCOOTER-1" />
              <input name="lat" type="number" step="any" required placeholder="lat" value="46.5547" />
              <input name="lon" type="number" step="any" required placeholder="lon" value="15.6459" />
            </div>
            <button type="submit">Start rental</button>
          </form>
          <pre id="start-rental-result">No request yet.</pre>
        </section>

        <section class="card">
          <h3>POST /api/v1/rentals/{rentalId}/end</h3>
          <form id="end-rental-form" class="grid">
            <div class="row">
              <input id="end-rental-id" name="rentalId" type="text" required placeholder="rentalId" />
              <input name="lat" type="number" step="any" required placeholder="lat" value="46.5601" />
              <input name="lon" type="number" step="any" required placeholder="lon" value="15.65" />
              <input name="batteryLevel" type="number" min="0" max="100" required placeholder="batteryLevel" value="75" />
            </div>
            <button type="submit">End rental</button>
          </form>
          <pre id="end-rental-result">No request yet.</pre>
        </section>

        <section class="card">
          <h3>GET /api/v1/rentals/active?userId=...</h3>
          <form id="active-rentals-form" class="grid">
            <div class="row">
              <input id="active-user-id" type="text" required placeholder="userId" />
            </div>
            <button type="submit">Get active rentals</button>
          </form>
          <pre id="active-rentals-result">No request yet.</pre>
        </section>
      </div>
    `;
  }
}

if (!customElements.get("rentals-mfe")) {
  customElements.define("rentals-mfe", RentalsMfe);
}
