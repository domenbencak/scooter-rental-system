package com.scooterrental.rentalservice.application.service;

import com.scooterrental.rentalservice.application.EndRentalCommand;
import com.scooterrental.rentalservice.application.StartRentalCommand;
import com.scooterrental.rentalservice.application.port.RentalEventPublisher;
import com.scooterrental.rentalservice.application.port.RentalRepository;
import com.scooterrental.rentalservice.application.port.ScooterGateway;
import com.scooterrental.rentalservice.application.port.UserGateway;
import com.scooterrental.rentalservice.domain.Rental;
import com.scooterrental.rentalservice.domain.RentalStatus;
import com.scooterrental.rentalservice.domain.exception.RentalNotFoundException;
import com.scooterrental.rentalservice.domain.exception.UserAlreadyHasActiveRentalException;
import com.scooterrental.rentalservice.domain.exception.UserNotEligibleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class RentalApplicationService {

    private static final Logger log = LoggerFactory.getLogger(RentalApplicationService.class);

    private final RentalRepository rentalRepository;
    private final UserGateway userGateway;
    private final ScooterGateway scooterGateway;
    private final RentalEventPublisher rentalEventPublisher;
    private final Clock clock;

    public RentalApplicationService(
            RentalRepository rentalRepository,
            UserGateway userGateway,
            ScooterGateway scooterGateway,
            RentalEventPublisher rentalEventPublisher,
            Clock clock
    ) {
        this.rentalRepository = rentalRepository;
        this.userGateway = userGateway;
        this.scooterGateway = scooterGateway;
        this.rentalEventPublisher = rentalEventPublisher;
        this.clock = clock;
    }

    public Mono<Rental> startRental(StartRentalCommand command) {
        return userGateway.getUser(command.userId())
                .flatMap(user -> validateUserStatus(command.userId(), user.status())
                        .then(Mono.defer(() -> rentalRepository.existsActiveRentalByUserId(command.userId()))))
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(new UserAlreadyHasActiveRentalException(command.userId()));
                    }

                    return Mono.defer(() -> scooterGateway.reserveScooterForRental(command.scooterId(), command.startLocation()));
                })
                .flatMap(scooter -> rentalRepository.save(
                        Rental.start(
                                command.userId(),
                                command.scooterId(),
                                command.startLocation(),
                                Instant.now(clock),
                                scooter.batteryLevel()
                        )
                ))
                .flatMap(savedRental -> publishStartedEvent(savedRental).thenReturn(savedRental))
                .doOnSuccess(rental -> log.info(
                        "rental_started rentalId={} userId={} scooterId={}",
                        rental.rentalId(),
                        rental.userId(),
                        rental.scooterId()
                ));
    }

    public Mono<Rental> endRental(String rentalId, EndRentalCommand command) {
        return rentalRepository.findById(rentalId)
                .switchIfEmpty(Mono.error(new RentalNotFoundException(rentalId)))
                .flatMap(existingRental -> {
                    if (existingRental.status() != RentalStatus.ACTIVE) {
                        return Mono.error(new IllegalStateException("Rental is already ended."));
                    }

                    int batteryLevel = command.batteryLevel() != null
                            ? command.batteryLevel()
                            : existingRental.batteryLevelAtStart();

                    return scooterGateway.releaseScooterFromRental(
                                    existingRental.scooterId(),
                                    command.endLocation(),
                                    batteryLevel
                            )
                            .then(rentalRepository.save(existingRental.end(
                                    command.endLocation(),
                                    Instant.now(clock),
                                    batteryLevel
                            )));
                })
                .flatMap(savedRental -> publishEndedEvent(savedRental).thenReturn(savedRental))
                .doOnSuccess(rental -> log.info(
                        "rental_ended rentalId={} userId={} scooterId={} durationMinutes={}",
                        rental.rentalId(),
                        rental.userId(),
                        rental.scooterId(),
                        rental.durationMinutes()
                ));
    }

    public Flux<Rental> getActiveRentals(UUID userId) {
        return rentalRepository.findActiveByUserId(userId)
                .doOnSubscribe(ignored -> log.info("active_rentals_requested userId={}", userId));
    }

    private Mono<Void> validateUserStatus(UUID userId, String status) {
        if (!"ACTIVE".equals(status == null ? null : status.toUpperCase(Locale.ROOT))) {
            return Mono.error(new UserNotEligibleException(userId, status));
        }
        return Mono.empty();
    }

    private Mono<Void> publishStartedEvent(Rental rental) {
        return rentalEventPublisher.publishRentalStarted(rental)
                .doOnError(error -> log.warn(
                        "rental_started_event_failed rentalId={} reason={}",
                        rental.rentalId(),
                        error.getMessage()
                ))
                .onErrorResume(error -> Mono.empty());
    }

    private Mono<Void> publishEndedEvent(Rental rental) {
        return rentalEventPublisher.publishRentalEnded(rental)
                .doOnError(error -> log.warn(
                        "rental_ended_event_failed rentalId={} reason={}",
                        rental.rentalId(),
                        error.getMessage()
                ))
                .onErrorResume(error -> Mono.empty());
    }
}
