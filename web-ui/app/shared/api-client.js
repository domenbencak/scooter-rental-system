const STORAGE_KEY = "scooter-rental.api-base-url";
const DEFAULT_API_BASE_URL = "http://localhost:8083";

function normalizeBaseUrl(value) {
  if (typeof value !== "string") {
    return DEFAULT_API_BASE_URL;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function safeReadStorage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const stored = safeReadStorage();
  if (stored) {
    return normalizeBaseUrl(stored);
  }
  const configured = window.__APP_CONFIG__?.apiBaseUrl;
  return normalizeBaseUrl(configured || DEFAULT_API_BASE_URL);
}

export function setApiBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    return normalized;
  }
  return normalized;
}

function parseResponseBody(rawBody) {
  if (!rawBody) {
    return null;
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
}

export async function requestJson(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const route = path.startsWith("/") ? path : `/${path}`;
  const headers = {
    Accept: "application/json",
  };

  const requestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestInit.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${baseUrl}${route}`, requestInit);
    const rawBody = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      traceId: response.headers.get("X-Trace-Id"),
      data: parseResponseBody(rawBody),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      traceId: null,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
