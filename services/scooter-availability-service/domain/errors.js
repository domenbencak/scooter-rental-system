class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

class InvalidStatusTransitionError extends Error {
  constructor(fromStatus, toStatus) {
    super(`Invalid status transition from ${fromStatus} to ${toStatus}.`);
    this.name = "InvalidStatusTransitionError";
  }
}

module.exports = {
  ValidationError,
  InvalidStatusTransitionError
};
