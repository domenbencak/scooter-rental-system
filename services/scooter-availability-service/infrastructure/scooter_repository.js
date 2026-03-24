const fs = require("fs");
const path = require("path");
const Datastore = require("@seald-io/nedb");
const { SCOOTER_STATUS } = require("../domain/scooter");

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

class ScooterRepository {
  constructor(options = {}) {
    const inMemoryOnly = options.inMemoryOnly === true;
    const filename =
      options.filename || path.join(process.cwd(), "data", "scooters.db");

    if (!inMemoryOnly) {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    }

    this.db = new Datastore({
      filename,
      autoload: true,
      inMemoryOnly
    });

    this.db.ensureIndex({ fieldName: "scooterId", unique: true });
    this.db.ensureIndex({ fieldName: "status" });
  }

  async findById(scooterId) {
    return new Promise((resolve, reject) => {
      this.db.findOne({ scooterId }, (error, document) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(document || null);
      });
    });
  }

  async save(scooter) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { scooterId: scooter.scooterId },
        { $set: scooter },
        { upsert: true, returnUpdatedDocs: true },
        (error, _numAffected, affectedDocument) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(affectedDocument);
        }
      );
    });
  }

  async findAvailableNear(lat, lon, radiusMeters) {
    return new Promise((resolve, reject) => {
      this.db.find({ status: SCOOTER_STATUS.AVAILABLE }, (error, documents) => {
        if (error) {
          reject(error);
          return;
        }

        const result = documents.filter((scooter) => {
          const distance = haversineDistanceMeters(
            lat,
            lon,
            scooter.location.lat,
            scooter.location.lon
          );

          return distance <= radiusMeters;
        });

        resolve(result);
      });
    });
  }
}

module.exports = {
  ScooterRepository,
  haversineDistanceMeters
};
