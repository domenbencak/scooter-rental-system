package com.scooterrental.rentalservice.interfaces.rest;

import com.scooterrental.rentalservice.application.service.RentalApplicationService;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.domain.Rental;
import com.scooterrental.rentalservice.domain.RentalStatus;
import com.scooterrental.rentalservice.domain.exception.RentalNotFoundException;
import com.scooterrental.rentalservice.infrastructure.config.RequestLoggingFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RentalControllerTest {

    @Mock
    private RentalApplicationService rentalApplicationService;

    private WebTestClient webTestClient;

    @BeforeEach
    void setUp() {
        webTestClient = WebTestClient.bindToController(new RentalController(rentalApplicationService))
                .controllerAdvice(new GlobalExceptionHandler())
                .webFilter(new RequestLoggingFilter())
                .build();
    }

    @Test
    void shouldStartRentalEndpoint() {
        UUID userId = UUID.randomUUID();
        Rental rental = new Rental(
                "rental-1",
                userId,
                "SCOOTER-1",
                RentalStatus.ACTIVE,
                Instant.parse("2026-03-28T10:15:30Z"),
                null,
                new GeoLocation(46.5547, 15.6459),
                null,
                88,
                null
        );

        when(rentalApplicationService.startRental(any())).thenReturn(Mono.just(rental));

        webTestClient.post()
                .uri("/api/v1/rentals/start")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                        {
                          "userId": "%s",
                          "scooterId": "SCOOTER-1",
                          "startLocation": {
                            "lat": 46.5547,
                            "lon": 15.6459
                          }
                        }
                        """.formatted(userId))
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.rentalId").isEqualTo("rental-1")
                .jsonPath("$.status").isEqualTo("ACTIVE")
                .jsonPath("$.startedAt").isEqualTo("2026-03-28T10:15:30Z");
    }

    @Test
    void shouldEndRentalEndpoint() {
        UUID userId = UUID.randomUUID();
        Rental rental = new Rental(
                "rental-1",
                userId,
                "SCOOTER-1",
                RentalStatus.ENDED,
                Instant.parse("2026-03-28T09:45:30Z"),
                Instant.parse("2026-03-28T10:15:30Z"),
                new GeoLocation(46.5547, 15.6459),
                new GeoLocation(46.5601, 15.6500),
                88,
                76
        );

        when(rentalApplicationService.endRental(eq("rental-1"), any())).thenReturn(Mono.just(rental));

        webTestClient.post()
                .uri("/api/v1/rentals/rental-1/end")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                        {
                          "endLocation": {
                            "lat": 46.5601,
                            "lon": 15.65
                          },
                          "batteryLevel": 76
                        }
                        """)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.rentalId").isEqualTo("rental-1")
                .jsonPath("$.status").isEqualTo("ENDED")
                .jsonPath("$.durationMinutes").isEqualTo(30);
    }

    @Test
    void shouldReturnActiveRentalsEndpoint() {
        UUID userId = UUID.randomUUID();
        Rental firstRental = Rental.start(
                userId,
                "SCOOTER-1",
                new GeoLocation(46.5547, 15.6459),
                Instant.parse("2026-03-28T09:15:30Z"),
                90
        );

        when(rentalApplicationService.getActiveRentals(userId)).thenReturn(Flux.just(firstRental));

        webTestClient.get()
                .uri(uriBuilder -> uriBuilder.path("/api/v1/rentals/active")
                        .queryParam("userId", userId)
                        .build())
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.items[0].rentalId").isEqualTo(firstRental.rentalId())
                .jsonPath("$.items[0].scooterId").isEqualTo("SCOOTER-1");
    }

    @Test
    void shouldMapDomainErrorsToHttpStatusCodes() {
        when(rentalApplicationService.endRental(eq("missing-rental"), any()))
                .thenReturn(Mono.error(new RentalNotFoundException("missing-rental")));

        webTestClient.post()
                .uri("/api/v1/rentals/missing-rental/end")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                        {
                          "endLocation": {
                            "lat": 46.5601,
                            "lon": 15.65
                          }
                        }
                        """)
                .exchange()
                .expectStatus().isNotFound()
                .expectBody()
                .jsonPath("$.error").isEqualTo("RESOURCE_NOT_FOUND");
    }
}
