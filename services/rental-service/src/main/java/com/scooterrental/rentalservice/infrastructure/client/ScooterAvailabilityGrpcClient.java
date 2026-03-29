package com.scooterrental.rentalservice.infrastructure.client;

import com.scooterrental.rentalservice.application.ScooterSnapshot;
import com.scooterrental.rentalservice.application.port.ScooterGateway;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.domain.exception.ExternalServiceException;
import com.scooterrental.rentalservice.domain.exception.ScooterUnavailableException;
import com.scooterrental.rentalservice.infrastructure.config.ScooterServiceProperties;
import com.scooterrental.rentalservice.scooteravailability.CheckAvailableScootersRequest;
import com.scooterrental.rentalservice.scooteravailability.CheckAvailableScootersResponse;
import com.scooterrental.rentalservice.scooteravailability.Scooter;
import com.scooterrental.rentalservice.scooteravailability.ScooterAvailabilityServiceGrpc;
import com.scooterrental.rentalservice.scooteravailability.ScooterStatus;
import com.scooterrental.rentalservice.scooteravailability.UpdateScooterStatusRequest;
import com.scooterrental.rentalservice.scooteravailability.UpdateScooterStatusResponse;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class ScooterAvailabilityGrpcClient implements ScooterGateway {

    private static final Logger log = LoggerFactory.getLogger(ScooterAvailabilityGrpcClient.class);

    private final ScooterAvailabilityServiceGrpc.ScooterAvailabilityServiceStub scooterAvailabilityStub;
    private final ScooterServiceProperties properties;

    public ScooterAvailabilityGrpcClient(
            ScooterAvailabilityServiceGrpc.ScooterAvailabilityServiceStub scooterAvailabilityStub,
            ScooterServiceProperties properties
    ) {
        this.scooterAvailabilityStub = scooterAvailabilityStub;
        this.properties = properties;
    }

    @Override
    public Mono<ScooterSnapshot> reserveScooterForRental(String scooterId, GeoLocation location) {
        CheckAvailableScootersRequest request = CheckAvailableScootersRequest.newBuilder()
                .setLatitude(location.lat())
                .setLongitude(location.lon())
                .setRadiusMeters(properties.availabilityRadiusMeters())
                .build();

        return this.<CheckAvailableScootersResponse>unaryCall(observer -> scooterAvailabilityStub.checkAvailableScooters(request, observer))
                .flatMapMany(response -> Flux.fromIterable(response.getScootersList()))
                .filter(scooter -> scooterId.equals(scooter.getScooterId()))
                .next()
                .switchIfEmpty(Mono.error(new ScooterUnavailableException(
                        "Scooter '%s' is not available near the requested start location.".formatted(scooterId)
                )))
                .flatMap(scooter -> updateScooterStatus(scooterId, ScooterStatus.RENTED, scooter.getBatteryLevel(), location))
                .doOnSubscribe(ignored -> log.info("scooter_reservation_started scooterId={}", scooterId))
                .doOnSuccess(scooter -> log.info("scooter_reservation_completed scooterId={} status={}", scooterId, scooter.status()));
    }

    @Override
    public Mono<ScooterSnapshot> releaseScooterFromRental(String scooterId, GeoLocation location, int batteryLevel) {
        return updateScooterStatus(scooterId, ScooterStatus.AVAILABLE, batteryLevel, location)
                .doOnSubscribe(ignored -> log.info("scooter_release_started scooterId={}", scooterId))
                .doOnSuccess(scooter -> log.info("scooter_release_completed scooterId={} status={}", scooterId, scooter.status()));
    }

    private Mono<ScooterSnapshot> updateScooterStatus(
            String scooterId,
            ScooterStatus status,
            int batteryLevel,
            GeoLocation location
    ) {
        UpdateScooterStatusRequest request = UpdateScooterStatusRequest.newBuilder()
                .setScooterId(scooterId)
                .setStatus(status)
                .setBatteryLevel(batteryLevel)
                .setLatitude(location.lat())
                .setLongitude(location.lon())
                .build();

        return this.<UpdateScooterStatusResponse>unaryCall(observer -> scooterAvailabilityStub.updateScooterStatus(request, observer))
                .map(response -> mapSnapshot(response.getScooter()));
    }

    private ScooterSnapshot mapSnapshot(Scooter scooter) {
        return new ScooterSnapshot(
                scooter.getScooterId(),
                scooter.getStatus().name(),
                scooter.getBatteryLevel(),
                new GeoLocation(scooter.getLatitude(), scooter.getLongitude())
        );
    }

    private <T> Mono<T> unaryCall(GrpcInvoker<T> invoker) {
        return Mono.create(sink -> invoker.invoke(new StreamObserver<>() {
            @Override
            public void onNext(T value) {
                sink.success(value);
            }

            @Override
            public void onError(Throwable throwable) {
                sink.error(mapGrpcError(throwable));
            }

            @Override
            public void onCompleted() {
                // no-op for unary calls
            }
        }));
    }

    private RuntimeException mapGrpcError(Throwable throwable) {
        if (throwable instanceof StatusRuntimeException statusException) {
            Status.Code code = statusException.getStatus().getCode();
            if (code == Status.Code.INVALID_ARGUMENT || code == Status.Code.NOT_FOUND) {
                return new ScooterUnavailableException(statusException.getStatus().getDescription());
            }
            return new ExternalServiceException("Scooter availability service call failed.", statusException);
        }
        return new ExternalServiceException("Scooter availability service call failed.", throwable);
    }

    @FunctionalInterface
    private interface GrpcInvoker<T> {
        void invoke(StreamObserver<T> observer);
    }
}
