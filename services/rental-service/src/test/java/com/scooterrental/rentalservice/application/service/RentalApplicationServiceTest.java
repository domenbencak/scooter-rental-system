package com.scooterrental.rentalservice.application.service;

import com.scooterrental.rentalservice.application.EndRentalCommand;
import com.scooterrental.rentalservice.application.ScooterSnapshot;
import com.scooterrental.rentalservice.application.StartRentalCommand;
import com.scooterrental.rentalservice.application.UserAccount;
import com.scooterrental.rentalservice.application.port.RentalEventPublisher;
import com.scooterrental.rentalservice.application.port.RentalRepository;
import com.scooterrental.rentalservice.application.port.ScooterGateway;
import com.scooterrental.rentalservice.application.port.UserGateway;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.domain.Rental;
import com.scooterrental.rentalservice.domain.RentalStatus;
import com.scooterrental.rentalservice.domain.exception.UserAlreadyHasActiveRentalException;
import com.scooterrental.rentalservice.domain.exception.UserNotEligibleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RentalApplicationServiceTest {

    @Mock
    private RentalRepository rentalRepository;

    @Mock
    private UserGateway userGateway;

    @Mock
    private ScooterGateway scooterGateway;

    @Mock
    private RentalEventPublisher rentalEventPublisher;

    private RentalApplicationService rentalApplicationService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-03-28T10:15:30Z"), ZoneOffset.UTC);
        rentalApplicationService = new RentalApplicationService(
                rentalRepository,
                userGateway,
                scooterGateway,
                rentalEventPublisher,
                clock
        );
    }

    @Test
    void shouldStartRentalWhenUserAndScooterAreEligible() {
        UUID userId = UUID.randomUUID();
        GeoLocation startLocation = new GeoLocation(46.5547, 15.6459);
        StartRentalCommand command = new StartRentalCommand(userId, "SCOOTER-1", startLocation);

        when(userGateway.getUser(userId)).thenReturn(Mono.just(new UserAccount(userId, "ACTIVE")));
        when(rentalRepository.existsActiveRentalByUserId(userId)).thenReturn(Mono.just(false));
        when(scooterGateway.reserveScooterForRental("SCOOTER-1", startLocation))
                .thenReturn(Mono.just(new ScooterSnapshot("SCOOTER-1", "RENTED", 87, startLocation)));
        when(rentalRepository.save(any(Rental.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        when(rentalEventPublisher.publishRentalStarted(any(Rental.class))).thenReturn(Mono.empty());

        StepVerifier.create(rentalApplicationService.startRental(command))
                .assertNext(rental -> {
                    assertThat(rental.status()).isEqualTo(RentalStatus.ACTIVE);
                    assertThat(rental.userId()).isEqualTo(userId);
                    assertThat(rental.scooterId()).isEqualTo("SCOOTER-1");
                    assertThat(rental.startedAt()).isEqualTo(Instant.parse("2026-03-28T10:15:30Z"));
                    assertThat(rental.batteryLevelAtStart()).isEqualTo(87);
                })
                .verifyComplete();

        verify(rentalEventPublisher).publishRentalStarted(any(Rental.class));
    }

    @Test
    void shouldRejectRentalWhenUserAlreadyHasActiveRental() {
        UUID userId = UUID.randomUUID();
        StartRentalCommand command = new StartRentalCommand(userId, "SCOOTER-1", new GeoLocation(46.5547, 15.6459));

        when(userGateway.getUser(userId)).thenReturn(Mono.just(new UserAccount(userId, "ACTIVE")));
        when(rentalRepository.existsActiveRentalByUserId(userId)).thenReturn(Mono.just(true));

        StepVerifier.create(rentalApplicationService.startRental(command))
                .expectError(UserAlreadyHasActiveRentalException.class)
                .verify();

        verify(scooterGateway, never()).reserveScooterForRental(any(), any());
    }

    @Test
    void shouldRejectRentalForInactiveUser() {
        UUID userId = UUID.randomUUID();
        StartRentalCommand command = new StartRentalCommand(userId, "SCOOTER-1", new GeoLocation(46.5547, 15.6459));

        when(userGateway.getUser(userId)).thenReturn(Mono.just(new UserAccount(userId, "SUSPENDED")));

        StepVerifier.create(rentalApplicationService.startRental(command))
                .expectError(UserNotEligibleException.class)
                .verify();

        verify(rentalRepository, never()).existsActiveRentalByUserId(any());
    }

    @Test
    void shouldEndRentalAndPublishEvent() {
        UUID userId = UUID.randomUUID();
        Rental existingRental = new Rental(
                "rental-1",
                userId,
                "SCOOTER-1",
                RentalStatus.ACTIVE,
                Instant.parse("2026-03-28T09:45:30Z"),
                null,
                new GeoLocation(46.5547, 15.6459),
                null,
                90,
                null
        );

        GeoLocation endLocation = new GeoLocation(46.5601, 15.6500);

        when(rentalRepository.findById("rental-1")).thenReturn(Mono.just(existingRental));
        when(scooterGateway.releaseScooterFromRental("SCOOTER-1", endLocation, 80))
                .thenReturn(Mono.just(new ScooterSnapshot("SCOOTER-1", "AVAILABLE", 80, endLocation)));
        when(rentalRepository.save(any(Rental.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        when(rentalEventPublisher.publishRentalEnded(any(Rental.class))).thenReturn(Mono.empty());

        StepVerifier.create(rentalApplicationService.endRental("rental-1", new EndRentalCommand(endLocation, 80)))
                .assertNext(rental -> {
                    assertThat(rental.status()).isEqualTo(RentalStatus.ENDED);
                    assertThat(rental.endedAt()).isEqualTo(Instant.parse("2026-03-28T10:15:30Z"));
                    assertThat(rental.durationMinutes()).isEqualTo(30);
                    assertThat(rental.batteryLevelAtEnd()).isEqualTo(80);
                })
                .verifyComplete();

        verify(scooterGateway).releaseScooterFromRental("SCOOTER-1", endLocation, 80);
        verify(rentalEventPublisher).publishRentalEnded(any(Rental.class));
    }

    @Test
    void shouldReturnActiveRentalsForUser() {
        UUID userId = UUID.randomUUID();
        Rental firstRental = Rental.start(
                userId,
                "SCOOTER-1",
                new GeoLocation(46.5547, 15.6459),
                Instant.parse("2026-03-28T08:15:30Z"),
                91
        );
        Rental secondRental = Rental.start(
                userId,
                "SCOOTER-2",
                new GeoLocation(46.5550, 15.6460),
                Instant.parse("2026-03-28T09:15:30Z"),
                76
        );

        when(rentalRepository.findActiveByUserId(userId)).thenReturn(Flux.just(firstRental, secondRental));

        StepVerifier.create(rentalApplicationService.getActiveRentals(userId))
                .expectNext(firstRental, secondRental)
                .verifyComplete();

        verify(rentalRepository).findActiveByUserId(eq(userId));
    }
}
