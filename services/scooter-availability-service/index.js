const grpc = require("@grpc/grpc-js");
const { ScooterAvailabilityUseCases } = require("./application/use_cases");
const { ScooterRepository } = require("./infrastructure/scooter_repository");
const { createLogger } = require("./infrastructure/logger");
const { createGrpcServer } = require("./interfaces/grpc/server");

const logger = createLogger("scooter-availability-service");
const repository = new ScooterRepository();
const useCases = new ScooterAvailabilityUseCases({ repository, logger });
const server = createGrpcServer({ useCases, logger });

const port = process.env.GRPC_PORT || "50051";

async function startServer() {
  await useCases.seedDemoScooters();

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        logger.error("grpc_server_start_failed", { error: error.message });
        process.exit(1);
      }

      logger.info("grpc_server_started", { port: boundPort });
      server.start();
    }
  );
}

startServer();
