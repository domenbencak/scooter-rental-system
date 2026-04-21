import { getApiBaseUrl, setApiBaseUrl } from "/shared/api-client.js";

const MICRO_FRONTENDS = [
  {
    id: "users",
    label: "Users",
    modulePath: "/mfes/users/users-mfe.js",
    elementTag: "users-mfe",
  },
  {
    id: "rentals",
    label: "Rentals",
    modulePath: "/mfes/rentals/rentals-mfe.js",
    elementTag: "rentals-mfe",
  },
  {
    id: "scooters",
    label: "Scooters",
    modulePath: "/mfes/scooters/scooters-mfe.js",
    elementTag: "scooters-mfe",
  },
];

function findMfeById(id) {
  return MICRO_FRONTENDS.find((mfe) => mfe.id === id) || MICRO_FRONTENDS[0];
}

class AppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.activeMfeId = MICRO_FRONTENDS[0].id;
    this.loadedMfeIds = new Set();
    this.sharedState = {
      userId: "-",
      rentalId: "-",
      scooterId: "-",
    };
  }

  connectedCallback() {
    this.render();
    this.registerEvents();
    this.loadCurrentMicroFrontend();
  }

  disconnectedCallback() {
    window.removeEventListener("scooter:user-selected", this.onUserSelected);
    window.removeEventListener("scooter:rental-selected", this.onRentalSelected);
    window.removeEventListener("scooter:scooter-selected", this.onScooterSelected);
  }

  registerEvents() {
    const gatewayForm = this.shadowRoot.querySelector("#gateway-form");
    gatewayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = this.shadowRoot.querySelector("#gateway-url-input");
      const storedUrl = setApiBaseUrl(input.value);
      input.value = storedUrl;
      this.shadowRoot.querySelector("#gateway-url-current").textContent = storedUrl;
    });

    this.shadowRoot.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const nextId = button.getAttribute("data-mfe-id");
        if (!nextId || nextId === this.activeMfeId) {
          return;
        }
        this.activeMfeId = nextId;
        this.refreshTabs();
        this.loadCurrentMicroFrontend();
      });
    });

    this.onUserSelected = (event) => {
      this.sharedState.userId = event.detail?.userId || "-";
      this.renderSharedState();
    };
    this.onRentalSelected = (event) => {
      this.sharedState.rentalId = event.detail?.rentalId || "-";
      this.renderSharedState();
    };
    this.onScooterSelected = (event) => {
      this.sharedState.scooterId = event.detail?.scooterId || "-";
      this.renderSharedState();
    };

    window.addEventListener("scooter:user-selected", this.onUserSelected);
    window.addEventListener("scooter:rental-selected", this.onRentalSelected);
    window.addEventListener("scooter:scooter-selected", this.onScooterSelected);
  }

  refreshTabs() {
    this.shadowRoot.querySelectorAll(".tab-button").forEach((button) => {
      const buttonId = button.getAttribute("data-mfe-id");
      button.classList.toggle("active", buttonId === this.activeMfeId);
    });
  }

  renderSharedState() {
    this.shadowRoot.querySelector("#shared-state-user").textContent = this.sharedState.userId;
    this.shadowRoot.querySelector("#shared-state-rental").textContent = this.sharedState.rentalId;
    this.shadowRoot.querySelector("#shared-state-scooter").textContent = this.sharedState.scooterId;
  }

  async loadCurrentMicroFrontend() {
    const mfe = findMfeById(this.activeMfeId);
    const host = this.shadowRoot.querySelector("#mfe-host");
    const title = this.shadowRoot.querySelector("#mfe-title");
    title.textContent = mfe.label;

    if (!this.loadedMfeIds.has(mfe.id)) {
      await import(mfe.modulePath);
      this.loadedMfeIds.add(mfe.id);
    }

    const element = document.createElement(mfe.elementTag);
    host.replaceChildren(element);
  }

  render() {
    const activeBaseUrl = getApiBaseUrl();
    const tabs = MICRO_FRONTENDS.map(
      (mfe) =>
        `<button class="tab-button ${mfe.id === this.activeMfeId ? "active" : ""}" data-mfe-id="${mfe.id}">${mfe.label}</button>`,
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          display: block;
          min-height: 100vh;
          background: #f3f4f6;
        }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px;
        }
        h1 {
          margin: 0 0 16px;
          font-size: 28px;
        }
        .panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .gateway {
          display: grid;
          gap: 10px;
        }
        .gateway-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .gateway-row input {
          flex: 1;
        }
        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .tab-button {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
        }
        .tab-button.active {
          background: #1d4ed8;
          color: #ffffff;
          border-color: #1d4ed8;
        }
        input, button, select {
          font: inherit;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
        }
        button {
          cursor: pointer;
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }
        .shared-state {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .shared-state b {
          margin-right: 4px;
        }
      </style>
      <div class="container">
        <h1>Scooter Rental Web UI (Micro Frontends)</h1>

        <div class="panel gateway">
          <form id="gateway-form" class="gateway-row">
            <label for="gateway-url-input"><b>Web API Gateway</b></label>
            <input id="gateway-url-input" type="url" required value="${activeBaseUrl}" />
            <button type="submit">Save</button>
          </form>
          <div>Current gateway URL: <code id="gateway-url-current">${activeBaseUrl}</code></div>
        </div>

        <div class="panel">
          <div class="shared-state">
            <div><b>User:</b> <code id="shared-state-user">-</code></div>
            <div><b>Rental:</b> <code id="shared-state-rental">-</code></div>
            <div><b>Scooter:</b> <code id="shared-state-scooter">-</code></div>
          </div>
        </div>

        <div class="tabs">${tabs}</div>

        <div class="panel">
          <h2 id="mfe-title"></h2>
          <div id="mfe-host"></div>
        </div>
      </div>
    `;
    this.renderSharedState();
  }
}

if (!customElements.get("app-shell")) {
  customElements.define("app-shell", AppShell);
}
