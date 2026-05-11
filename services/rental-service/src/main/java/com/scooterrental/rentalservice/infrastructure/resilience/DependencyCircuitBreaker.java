package com.scooterrental.rentalservice.infrastructure.resilience;

import com.scooterrental.rentalservice.domain.exception.ExternalServiceException;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class DependencyCircuitBreaker {

    private enum State {
        CLOSED,
        OPEN,
        HALF_OPEN
    }

    private final String dependencyName;
    private final int failureThreshold;
    private final Duration openStateDuration;
    private final Clock clock;

    private State state = State.CLOSED;
    private int consecutiveFailures = 0;
    private boolean halfOpenTrialInProgress = false;
    private Instant openedAt = Instant.EPOCH;

    public DependencyCircuitBreaker(String dependencyName, int failureThreshold, Duration openStateDuration, Clock clock) {
        if (failureThreshold < 1) {
            throw new IllegalArgumentException("failureThreshold must be at least 1.");
        }
        if (openStateDuration == null || openStateDuration.isNegative() || openStateDuration.isZero()) {
            throw new IllegalArgumentException("openStateDuration must be positive.");
        }

        this.dependencyName = Objects.requireNonNull(dependencyName, "dependencyName must not be null.");
        this.failureThreshold = failureThreshold;
        this.openStateDuration = openStateDuration;
        this.clock = Objects.requireNonNull(clock, "clock must not be null.");
    }

    public <T> Mono<T> execute(Supplier<Mono<T>> action, Predicate<Throwable> countsAsFailure) {
        Objects.requireNonNull(action, "action must not be null.");
        Objects.requireNonNull(countsAsFailure, "countsAsFailure must not be null.");

        return Mono.defer(() -> {
            if (!tryAcquirePermission()) {
                return Mono.error(new ExternalServiceException(
                        "Circuit for dependency '%s' is open.".formatted(dependencyName)
                ));
            }

            Mono<T> result;
            try {
                result = action.get();
            } catch (Throwable error) {
                recordOutcome(error, countsAsFailure);
                return Mono.error(error);
            }

            if (result == null) {
                IllegalStateException error = new IllegalStateException("Circuit breaker action returned null Mono.");
                recordOutcome(error, countsAsFailure);
                return Mono.error(error);
            }

            return result
                    .doOnSuccess(ignored -> recordSuccess())
                    .doOnError(error -> recordOutcome(error, countsAsFailure));
        });
    }

    private void recordOutcome(Throwable error, Predicate<Throwable> countsAsFailure) {
        if (countsAsFailure.test(error)) {
            recordFailure();
            return;
        }
        recordSuccess();
    }

    private synchronized boolean tryAcquirePermission() {
        Instant now = Instant.now(clock);
        if (state == State.OPEN) {
            if (now.isBefore(openedAt.plus(openStateDuration))) {
                return false;
            }
            state = State.HALF_OPEN;
            halfOpenTrialInProgress = false;
        }

        if (state == State.HALF_OPEN) {
            if (halfOpenTrialInProgress) {
                return false;
            }
            halfOpenTrialInProgress = true;
        }

        return true;
    }

    private synchronized void recordSuccess() {
        state = State.CLOSED;
        consecutiveFailures = 0;
        halfOpenTrialInProgress = false;
    }

    private synchronized void recordFailure() {
        if (state == State.HALF_OPEN) {
            openCircuit();
            return;
        }

        if (state == State.OPEN) {
            return;
        }

        consecutiveFailures++;
        if (consecutiveFailures >= failureThreshold) {
            openCircuit();
        }
    }

    private synchronized void openCircuit() {
        state = State.OPEN;
        openedAt = Instant.now(clock);
        consecutiveFailures = 0;
        halfOpenTrialInProgress = false;
    }
}
