package com.scooterrental.rentalservice.infrastructure.resilience;

import com.scooterrental.rentalservice.domain.exception.ExternalServiceException;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class DependencyCircuitBreakerTest {

    @Test
    void shouldOpenCircuitAfterConfiguredFailures() {
        MutableClock clock = new MutableClock(Instant.parse("2026-05-11T20:00:00Z"));
        DependencyCircuitBreaker breaker = new DependencyCircuitBreaker(
                "user-service",
                2,
                Duration.ofSeconds(30),
                clock
        );

        StepVerifier.create(breaker.execute(
                        () -> Mono.error(new ExternalServiceException("dependency_down")),
                        this::isDependencyFailure
                ))
                .expectError(ExternalServiceException.class)
                .verify();

        StepVerifier.create(breaker.execute(
                        () -> Mono.error(new ExternalServiceException("dependency_down")),
                        this::isDependencyFailure
                ))
                .expectError(ExternalServiceException.class)
                .verify();

        StepVerifier.create(breaker.execute(
                        () -> Mono.just("ok"),
                        this::isDependencyFailure
                ))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(ExternalServiceException.class);
                    assertThat(error.getMessage()).contains("Circuit for dependency 'user-service' is open.");
                })
                .verify();
    }

    @Test
    void shouldCloseCircuitAfterHalfOpenSuccess() {
        MutableClock clock = new MutableClock(Instant.parse("2026-05-11T20:10:00Z"));
        DependencyCircuitBreaker breaker = new DependencyCircuitBreaker(
                "scooter-availability-service",
                1,
                Duration.ofSeconds(20),
                clock
        );

        StepVerifier.create(breaker.execute(
                        () -> Mono.error(new ExternalServiceException("grpc_unavailable")),
                        this::isDependencyFailure
                ))
                .expectError(ExternalServiceException.class)
                .verify();

        StepVerifier.create(breaker.execute(
                        () -> Mono.just("blocked"),
                        this::isDependencyFailure
                ))
                .expectError(ExternalServiceException.class)
                .verify();

        clock.advance(Duration.ofSeconds(21));

        StepVerifier.create(breaker.execute(
                        () -> Mono.just("recovered"),
                        this::isDependencyFailure
                ))
                .expectNext("recovered")
                .verifyComplete();

        StepVerifier.create(breaker.execute(
                        () -> Mono.just("closed_again"),
                        this::isDependencyFailure
                ))
                .expectNext("closed_again")
                .verifyComplete();
    }

    private boolean isDependencyFailure(Throwable error) {
        return error instanceof ExternalServiceException;
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
