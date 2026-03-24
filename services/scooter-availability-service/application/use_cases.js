const {
  SCOOTER_STATUS,
  assertTransitionAllowed,
  assertValidBatteryLevel,
  assertValidStatus,
} = require("../domain/scooter");
const { ValidationError } = require("../domain/errors");

class ScooterAvailabilityUseCases {
  constructor({ repository, logger }) {
    this.repository = repository;
    this.logger = logger;
  }

  async checkAvailableScooters({ lat, lon, radiusMeters }) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new ValidationError(
        "Latitude and longitude must be valid numbers.",
      );
    }

    if (!Number.isInteger(radiusMeters) || radiusMeters <= 0) {
      throw new ValidationError("radiusMeters must be a positive integer.");
    }

    const scooters = await this.repository.findAvailableNear(
      lat,
      lon,
      radiusMeters,
    );
    this.logger.info("check_available_scooters", {
      count: scooters.length,
      radiusMeters,
    });
    return scooters;
  }

  async updateScooterStatus({ scooterId, status, batteryLevel, location }) {
    if (!scooterId || typeof scooterId !== "string") {
      throw new ValidationError("scooterId is required.");
    }

    assertValidStatus(status);
    assertValidBatteryLevel(batteryLevel);

    if (
      !location ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lon)
    ) {
      throw new ValidationError(
        "Location must include numeric lat and lon values.",
      );
    }

    const existing = await this.repository.findById(scooterId);
    if (existing) {
      assertTransitionAllowed(existing.status, status);
    }

    const updatedScooter = {
      scooterId,
      status,
      batteryLevel,
      location,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.save(updatedScooter);
    this.logger.info("update_scooter_status", {
      scooterId,
      fromStatus: existing ? existing.status : "NONE",
      toStatus: status,
    });

    return updatedScooter;
  }

  async seedDemoScooters() {
    const scooters = [
      {
        scooterId: "SCOOTER-1",
        status: SCOOTER_STATUS.AVAILABLE,
        batteryLevel: 90,
        location: { lat: 46.5547, lon: 15.6459 },
        updatedAt: new Date().toISOString(),
      },
      {
        scooterId: "SCOOTER-2",
        status: SCOOTER_STATUS.CHARGING,
        batteryLevel: 25,
        location: { lat: 46.558, lon: 15.64 },
        updatedAt: new Date().toISOString(),
      },
      {
        scooterId: "SCOOTER-3",
        status: SCOOTER_STATUS.AVAILABLE,
        batteryLevel: 70,
        location: { lat: 46.552, lon: 15.652 },
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const scooter of scooters) {
      await this.repository.save(scooter);
    }

    this.logger.info("seed_demo_scooters", { count: scooters.length });
  }
}

module.exports = {
  ScooterAvailabilityUseCases,
};
