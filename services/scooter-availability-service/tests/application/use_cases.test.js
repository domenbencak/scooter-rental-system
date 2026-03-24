const { ScooterAvailabilityUseCases } = require("../../application/use_cases");
const { SCOOTER_STATUS } = require("../../domain/scooter");

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

class InMemoryRepository {
  constructor() {
    this.store = new Map();
  }

  async findById(scooterId) {
    return this.store.get(scooterId) || null;
  }

  async save(scooter) {
    this.store.set(scooter.scooterId, scooter);
    return scooter;
  }

  async findAvailableNear(lat, lon, radiusMeters) {
    return [...this.store.values()].filter((item) => {
      const latInRange = Math.abs(item.location.lat - lat) < 0.01;
      const lonInRange = Math.abs(item.location.lon - lon) < 0.01;
      return (
        item.status === SCOOTER_STATUS.AVAILABLE &&
        latInRange &&
        lonInRange &&
        radiusMeters > 0
      );
    });
  }
}

describe("ScooterAvailabilityUseCases", () => {
  test("creates a scooter when updating status for unknown scooter", async () => {
    const repository = new InMemoryRepository();
    const useCases = new ScooterAvailabilityUseCases({
      repository,
      logger: createLogger(),
    });

    const updated = await useCases.updateScooterStatus({
      scooterId: "S-100",
      status: SCOOTER_STATUS.AVAILABLE,
      batteryLevel: 88,
      location: { lat: 46.55, lon: 15.64 },
    });

    expect(updated.scooterId).toBe("S-100");
    expect(updated.status).toBe(SCOOTER_STATUS.AVAILABLE);

    const stored = await repository.findById("S-100");
    expect(stored).not.toBeNull();
    expect(stored.batteryLevel).toBe(88);
  });

  test("rejects invalid status transitions", async () => {
    const repository = new InMemoryRepository();
    await repository.save({
      scooterId: "S-200",
      status: SCOOTER_STATUS.RENTED,
      batteryLevel: 76,
      location: { lat: 46.55, lon: 15.64 },
      updatedAt: new Date().toISOString(),
    });

    const useCases = new ScooterAvailabilityUseCases({
      repository,
      logger: createLogger(),
    });

    await expect(
      useCases.updateScooterStatus({
        scooterId: "S-200",
        status: SCOOTER_STATUS.CHARGING,
        batteryLevel: 60,
        location: { lat: 46.551, lon: 15.641 },
      }),
    ).rejects.toThrow("Invalid status transition");
  });

  test("returns available scooters within range", async () => {
    const repository = new InMemoryRepository();
    await repository.save({
      scooterId: "S-300",
      status: SCOOTER_STATUS.AVAILABLE,
      batteryLevel: 50,
      location: { lat: 46.555, lon: 15.646 },
      updatedAt: new Date().toISOString(),
    });
    await repository.save({
      scooterId: "S-301",
      status: SCOOTER_STATUS.RENTED,
      batteryLevel: 50,
      location: { lat: 46.555, lon: 15.646 },
      updatedAt: new Date().toISOString(),
    });

    const useCases = new ScooterAvailabilityUseCases({
      repository,
      logger: createLogger(),
    });
    const scooters = await useCases.checkAvailableScooters({
      lat: 46.555,
      lon: 15.646,
      radiusMeters: 500,
    });

    expect(scooters).toHaveLength(1);
    expect(scooters[0].scooterId).toBe("S-300");
  });
});
