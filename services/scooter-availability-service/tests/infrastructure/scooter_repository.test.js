const { ScooterRepository, haversineDistanceMeters } = require("../../infrastructure/scooter_repository");
const { SCOOTER_STATUS } = require("../../domain/scooter");

describe("ScooterRepository", () => {
  test("saves and finds scooter by id", async () => {
    const repository = new ScooterRepository({ inMemoryOnly: true });

    await repository.save({
      scooterId: "S-1",
      status: SCOOTER_STATUS.AVAILABLE,
      batteryLevel: 99,
      location: { lat: 46.55, lon: 15.64 },
      updatedAt: new Date().toISOString()
    });

    const stored = await repository.findById("S-1");
    expect(stored).not.toBeNull();
    expect(stored.scooterId).toBe("S-1");
  });

  test("finds only available scooters in given radius", async () => {
    const repository = new ScooterRepository({ inMemoryOnly: true });

    await repository.save({
      scooterId: "S-2",
      status: SCOOTER_STATUS.AVAILABLE,
      batteryLevel: 80,
      location: { lat: 46.5547, lon: 15.6459 },
      updatedAt: new Date().toISOString()
    });

    await repository.save({
      scooterId: "S-3",
      status: SCOOTER_STATUS.RENTED,
      batteryLevel: 80,
      location: { lat: 46.5547, lon: 15.6459 },
      updatedAt: new Date().toISOString()
    });

    await repository.save({
      scooterId: "S-4",
      status: SCOOTER_STATUS.AVAILABLE,
      batteryLevel: 80,
      location: { lat: 46.8, lon: 15.9 },
      updatedAt: new Date().toISOString()
    });

    const near = await repository.findAvailableNear(46.5547, 15.6459, 700);

    expect(near).toHaveLength(1);
    expect(near[0].scooterId).toBe("S-2");
  });

  test("haversine distance helper returns about zero for same coordinates", () => {
    const distance = haversineDistanceMeters(46.55, 15.64, 46.55, 15.64);
    expect(distance).toBeLessThan(0.01);
  });
});
