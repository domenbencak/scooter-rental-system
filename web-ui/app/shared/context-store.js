const CONTEXT_EVENT = "scooter:context-changed";
const CONTEXT_KEY = "__SCOOTER_SHARED_CONTEXT__";

function normalizeValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function ensureContext() {
  if (!window[CONTEXT_KEY]) {
    window[CONTEXT_KEY] = {
      userId: "",
      rentalId: "",
      scooterId: "",
    };
  }
  return window[CONTEXT_KEY];
}

export function getSharedContext() {
  const context = ensureContext();
  return { ...context };
}

export function emitSharedContext() {
  const detail = getSharedContext();
  window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail }));
  return detail;
}

export function updateSharedContext(patch) {
  const current = ensureContext();
  const next = {
    ...current,
    ...patch,
  };
  window[CONTEXT_KEY] = {
    userId: normalizeValue(next.userId),
    rentalId: normalizeValue(next.rentalId),
    scooterId: normalizeValue(next.scooterId),
  };
  return emitSharedContext();
}

export function subscribeSharedContext(listener) {
  const wrapped = (event) => {
    listener(event.detail || getSharedContext());
  };
  window.addEventListener(CONTEXT_EVENT, wrapped);
  return () => {
    window.removeEventListener(CONTEXT_EVENT, wrapped);
  };
}
