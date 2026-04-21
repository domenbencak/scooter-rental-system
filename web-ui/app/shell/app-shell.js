import { getApiBaseUrl, setApiBaseUrl } from "/shared/api-client.js";
import { emitSharedContext, getSharedContext, updateSharedContext } from "/shared/context-store.js";

const MICRO_FRONTENDS = [
  {
    id: "users",
    label: "Users",
    summary: "Identity, registration and profile lookup",
    modulePath: "/mfes/users/users-mfe.js",
    elementTag: "users-mfe",
  },
  {
    id: "rentals",
    label: "Rentals",
    summary: "Start, end and inspect rides",
    modulePath: "/mfes/rentals/rentals-mfe.js",
    elementTag: "rentals-mfe",
  },
  {
    id: "scooters",
    label: "Scooters",
    summary: "Availability and operational status",
    modulePath: "/mfes/scooters/scooters-mfe.js",
    elementTag: "scooters-mfe",
  },
];

function findMfeById(id) {
  return MICRO_FRONTENDS.find((mfe) => mfe.id === id) || MICRO_FRONTENDS[0];
}

const THEME_STORAGE_KEY = "scooter-rental.ui-theme";

function resolveInitialTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // ignore storage errors and fallback to default
  }
  return "dark";
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage errors
  }
}

class AppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.activeMfeId = MICRO_FRONTENDS[0].id;
    this.loadedMfeIds = new Set();
    this.sharedState = getSharedContext();
    this.theme = resolveInitialTheme();
  }

  connectedCallback() {
    this.render();
    this.applyTheme();
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

    const themeToggle = this.shadowRoot.querySelector("#theme-toggle");
    themeToggle.addEventListener("click", () => {
      this.toggleTheme();
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
      this.updateSharedState({
        userId: this.normalizeContextValue(event.detail?.userId),
      });
    };
    this.onRentalSelected = (event) => {
      this.updateSharedState({
        rentalId: this.normalizeContextValue(event.detail?.rentalId),
      });
    };
    this.onScooterSelected = (event) => {
      this.updateSharedState({
        scooterId: this.normalizeContextValue(event.detail?.scooterId),
      });
    };

    window.addEventListener("scooter:user-selected", this.onUserSelected);
    window.addEventListener("scooter:rental-selected", this.onRentalSelected);
    window.addEventListener("scooter:scooter-selected", this.onScooterSelected);
  }

  normalizeContextValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  updateSharedState(patch) {
    this.sharedState = updateSharedContext(patch);
    this.renderSharedState();
  }

  applyTheme() {
    this.setAttribute("data-theme", this.theme);
    const themeToggle = this.shadowRoot.querySelector("#theme-toggle");
    if (themeToggle) {
      const isDark = this.theme === "dark";
      themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
      themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    persistTheme(this.theme);
    this.applyTheme();

    const currentMfe = this.shadowRoot.querySelector("#mfe-host > *");
    if (currentMfe) {
      currentMfe.setAttribute("data-theme", this.theme);
    }
  }

  refreshTabs() {
    this.shadowRoot.querySelectorAll(".tab-button").forEach((button) => {
      const buttonId = button.getAttribute("data-mfe-id");
      button.classList.toggle("active", buttonId === this.activeMfeId);
      button.setAttribute("aria-pressed", String(buttonId === this.activeMfeId));
    });
  }

  setStateChip(chipId, value) {
    const element = this.shadowRoot.querySelector(chipId);
    if (!element) {
      return;
    }
    const normalized = value && value !== "" ? value : "-";
    element.textContent = normalized;
    element.classList.toggle("empty", normalized === "-");
  }

  renderSharedState() {
    this.setStateChip("#shared-state-user", this.sharedState.userId);
    this.setStateChip("#shared-state-rental", this.sharedState.rentalId);
    this.setStateChip("#shared-state-scooter", this.sharedState.scooterId);
  }

  async loadCurrentMicroFrontend() {
    const mfe = findMfeById(this.activeMfeId);
    const host = this.shadowRoot.querySelector("#mfe-host");
    const title = this.shadowRoot.querySelector("#mfe-title");
    const summary = this.shadowRoot.querySelector("#mfe-summary");
    title.textContent = mfe.label;
    summary.textContent = mfe.summary;

    if (!this.loadedMfeIds.has(mfe.id)) {
      await import(mfe.modulePath);
      this.loadedMfeIds.add(mfe.id);
    }

    const element = document.createElement(mfe.elementTag);
    element.setAttribute("data-theme", this.theme);
    host.replaceChildren(element);
    emitSharedContext();
  }

  render() {
    const activeBaseUrl = getApiBaseUrl();
    const tabs = MICRO_FRONTENDS.map(
      (mfe) =>
        `
          <button
            class="tab-button ${mfe.id === this.activeMfeId ? "active" : ""}"
            data-mfe-id="${mfe.id}"
            aria-pressed="${mfe.id === this.activeMfeId ? "true" : "false"}"
          >
            <span class="tab-marker tab-marker-${mfe.id}"></span>
            <span class="tab-content">
              <span class="tab-title">${mfe.label}</span>
              <span class="tab-meta">${mfe.summary}</span>
            </span>
          </button>
        `,
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --bg-main: #f4f7fb;
          --bg-panel: #ffffff;
          --bg-soft: #f8fafc;
          --text-main: #0f172a;
          --text-muted: #475569;
          --border: #dbe3ee;
          --accent: #2563eb;
          --accent-strong: #1d4ed8;
          --accent-soft: #eff6ff;
          --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);

          font-family: "Inter", "Avenir Next", "Segoe UI", sans-serif;
          color: var(--text-main);
          display: block;
          min-height: 100vh;
          background:
            radial-gradient(circle at 8% 0%, #e8f1ff 0%, transparent 44%),
            radial-gradient(circle at 90% 0%, #e7f8f2 0%, transparent 42%),
            linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
        }
        :host([data-theme="dark"]) {
          --bg-main: #0f172a;
          --bg-panel: #111827;
          --bg-soft: #0b1220;
          --text-main: #e2e8f0;
          --text-muted: #94a3b8;
          --border: #334155;
          --accent: #3b82f6;
          --accent-strong: #2563eb;
          --accent-soft: #1e293b;
          --shadow: 0 12px 28px rgba(2, 6, 23, 0.45);
          color-scheme: dark;
          background:
            radial-gradient(circle at 8% 0%, #1f2f4f 0%, transparent 44%),
            radial-gradient(circle at 90% 0%, #103437 0%, transparent 42%),
            linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
        }

        .page {
          max-width: 1320px;
          margin: 0 auto;
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .panel {
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
        }

        .topbar {
          padding: 16px;
          display: grid;
          gap: 14px;
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.9);
        }
        :host([data-theme="dark"]) .topbar {
          background: rgba(15, 23, 42, 0.84);
        }
        .topbar-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(980px, 100%);
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .brand-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(145deg, #1d4ed8, #0ea5e9);
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        :host([data-theme="dark"]) .brand-badge {
          background: linear-gradient(145deg, #2563eb, #14b8a6);
        }
        .brand h1 {
          margin: 0;
          font-size: 20px;
          letter-spacing: 0.2px;
        }
        .brand p {
          margin: 3px 0 0;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .context {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .state-item {
          border: 1px solid var(--border);
          background: var(--bg-soft);
          border-radius: 12px;
          padding: 10px;
          display: grid;
          gap: 4px;
        }
        .state-item span {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .state-item code {
          display: inline-block;
          width: fit-content;
          max-width: 100%;
          overflow: auto;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          color: #3730a3;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
        }
        .state-item code.empty {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
        }
        :host([data-theme="dark"]) .state-item code {
          background: #1e293b;
          border-color: #334155;
          color: #bfdbfe;
        }
        :host([data-theme="dark"]) .state-item code.empty {
          background: #0b1220;
          border-color: #334155;
          color: #94a3b8;
        }

        .tabs-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          width: min(860px, 100%);
        }
        .tab-button {
          width: 100%;
          text-align: left;
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text-main);
          border-radius: 12px;
          padding: 10px;
          cursor: pointer;
          display: flex;
          gap: 10px;
          align-items: center;
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        :host([data-theme="dark"]) .tab-button {
          background: #0f172a;
          color: #e2e8f0;
          border-color: #334155;
        }
        .tab-button:hover {
          transform: translateY(-1px);
          border-color: #c8d4e2;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.06);
        }
        :host([data-theme="dark"]) .tab-button:hover {
          border-color: #475569;
          box-shadow: 0 8px 16px rgba(2, 6, 23, 0.32);
        }
        .tab-button.active {
          background: var(--accent-soft);
          border-color: #bfdbfe;
          box-shadow: inset 0 0 0 1px #dbeafe;
        }
        :host([data-theme="dark"]) .tab-button.active {
          border-color: #3b82f6;
          box-shadow: inset 0 0 0 1px #1d4ed8;
        }
        .tab-marker {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex: 0 0 10px;
        }
        .tab-marker-users {
          background: #3b82f6;
        }
        .tab-marker-rentals {
          background: #f59e0b;
        }
        .tab-marker-scooters {
          background: #10b981;
        }
        .tab-content {
          display: grid;
          gap: 2px;
        }
        .tab-title {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
        }
        .tab-meta {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .workspace {
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
          gap: 14px;
        }

        .sidebar {
          padding: 14px;
          display: grid;
          gap: 12px;
          align-content: start;
        }
        .sidebar h2 {
          margin: 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.35px;
          color: var(--text-muted);
        }
        .sidebar p {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted);
        }

        .gateway {
          padding: 14px;
          display: grid;
          gap: 10px;
          align-content: start;
        }
        .gateway label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }
        .gateway input {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--bg-soft);
          border-radius: 10px;
          padding: 10px 11px;
          color: var(--text-main);
          font: inherit;
          box-sizing: border-box;
        }
        .gateway-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .gateway-form {
          display: grid;
          gap: 8px;
        }
        .gateway button {
          border: 1px solid var(--accent-strong);
          background: linear-gradient(145deg, var(--accent), #2563eb);
          color: #ffffff;
          border-radius: 10px;
          padding: 10px 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .theme-toggle {
          border: 1px solid var(--border);
          background: var(--bg-soft);
          color: var(--text-main);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        :host([data-theme="dark"]) .theme-toggle {
          background: #0f172a;
          border-color: #334155;
          color: #e2e8f0;
        }
        .gateway-info {
          font-size: 12px;
          color: var(--text-muted);
        }
        .gateway-info code {
          background: #eef2ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 7px;
          padding: 2px 6px;
        }
        :host([data-theme="dark"]) .gateway-info code {
          background: #1e293b;
          border-color: #334155;
          color: #93c5fd;
        }

        .module {
          padding: 16px;
        }
        .module-head {
          display: grid;
          gap: 3px;
          margin-bottom: 12px;
        }
        .module h2 {
          margin: 0;
          font-size: 22px;
          letter-spacing: 0.2px;
        }
        .module p {
          margin: 0;
          color: var(--text-muted);
          font-size: 13px;
        }

        @media (max-width: 1060px) {
          .workspace {
            grid-template-columns: 1fr;
          }
          .tabs-row {
            grid-template-columns: 1fr;
          }
          .topbar-actions {
            width: 100%;
            justify-content: stretch;
          }
        }

        @media (max-width: 860px) {
          .page {
            padding: 12px;
          }
          .topbar-row {
            flex-direction: column;
            align-items: stretch;
          }
          .topbar-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .tabs-row {
            width: 100%;
          }
          .context {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <div class="page">
        <header class="topbar panel">
          <div class="topbar-row">
            <div class="brand-wrap">
              <div class="brand-badge">SR</div>
              <div class="brand">
                <h1>Scooter Rental Console</h1>
                <p>Micro Frontends dashboard for end-to-end backend testing</p>
              </div>
            </div>
            <div class="topbar-actions">
              <div class="tabs-row">${tabs}</div>
              <button id="theme-toggle" class="theme-toggle" type="button">Dark mode</button>
            </div>
          </div>

          <div class="context">
            <div class="state-item">
              <span>User ID</span>
              <code id="shared-state-user">-</code>
            </div>
            <div class="state-item">
              <span>Rental ID</span>
              <code id="shared-state-rental">-</code>
            </div>
            <div class="state-item">
              <span>Scooter ID</span>
              <code id="shared-state-scooter">-</code>
            </div>
          </div>
        </header>

        <section class="workspace">
          <aside class="gateway panel">
            <h2>Gateway</h2>
            <p>Set API entrypoint used by all micro frontends.</p>
            <form id="gateway-form" class="gateway-form">
              <label for="gateway-url-input">Web API Gateway URL</label>
              <input id="gateway-url-input" type="url" required value="${activeBaseUrl}" />
              <div class="gateway-actions">
                <button type="submit">Apply</button>
              </div>
            </form>
            <div class="gateway-info">Current gateway: <code id="gateway-url-current">${activeBaseUrl}</code></div>
          </aside>

          <section class="module panel">
            <div class="module-head">
              <h2 id="mfe-title"></h2>
              <p id="mfe-summary"></p>
            </div>
            <div id="mfe-host"></div>
          </section>
        </section>
      </div>
    `;
    this.renderSharedState();
    this.refreshTabs();
  }
}

if (!customElements.get("app-shell")) {
  customElements.define("app-shell", AppShell);
}
