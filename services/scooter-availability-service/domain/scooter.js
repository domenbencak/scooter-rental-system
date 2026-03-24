const { InvalidStatusTransitionError, ValidationError } = require("./errors");

const SCOOTER_STATUS = Object.freeze({
  AVAILABLE: "AVAILABLE",
  RENTED: "RENTED",
  CHARGING: "CHARGING",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
});

const ALLOWED_TRANSITIONS = {
  [SCOOTER_STATUS.AVAILABLE]: new Set([
    SCOOTER_STATUS.RENTED,
    SCOOTER_STATUS.CHARGING,
    SCOOTER_STATUS.OUT_OF_SERVICE,
  ]),
  [SCOOTER_STATUS.RENTED]: new Set([
    SCOOTER_STATUS.AVAILABLE,
    SCOOTER_STATUS.OUT_OF_SERVICE,
  ]),
  [SCOOTER_STATUS.CHARGING]: new Set([
    SCOOTER_STATUS.AVAILABLE,
    SCOOTER_STATUS.OUT_OF_SERVICE,
  ]),
  [SCOOTER_STATUS.OUT_OF_SERVICE]: new Set([
    SCOOTER_STATUS.CHARGING,
    SCOOTER_STATUS.AVAILABLE,
  ]),
};

function isValidStatus(status) {
  return Object.values(SCOOTER_STATUS).includes(status);
}

function assertValidStatus(status) {
  if (!isValidStatus(status)) {
    throw new ValidationError("Invalid scooter status.");
  }
}

function assertValidBatteryLevel(batteryLevel) {
  if (
    !Number.isInteger(batteryLevel) ||
    batteryLevel < 0 ||
    batteryLevel > 100
  ) {
    throw new ValidationError(
      "Battery level must be an integer between 0 and 100.",
    );
  }
}

function assertTransitionAllowed(fromStatus, toStatus) {
  assertValidStatus(fromStatus);
  assertValidStatus(toStatus);

  if (fromStatus === toStatus) {
    return;
  }

  if (!ALLOWED_TRANSITIONS[fromStatus].has(toStatus)) {
    throw new InvalidStatusTransitionError(fromStatus, toStatus);
  }
}

module.exports = {
  SCOOTER_STATUS,
  assertTransitionAllowed,
  assertValidBatteryLevel,
  assertValidStatus,
  isValidStatus,
};
