package com.scooterrental.rentalservice.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record Rental(
        String rentalId,
        UUID userId,
        String scooterId,
        RentalStatus status,
        Instant startedAt,
        Instant endedAt,
        GeoLocation startLocation,
        GeoLocation endLocation,
        int batteryLevelAtStart,
        Integer batteryLevelAtEnd
) {

    public Rental {
        Objects.requireNonNull(rentalId, "rentalId is required.");
        Objects.requireNonNull(userId, "userId is required.");
        Objects.requireNonNull(scooterId, "scooterId is required.");
        Objects.requireNonNull(status, "status is required.");
        Objects.requireNonNull(startedAt, "startedAt is required.");
        Objects.requireNonNull(startLocation, "startLocation is required.");

        if (scooterId.isBlank()) {
            throw new IllegalArgumentException("scooterId is required.");
        }

        if (batteryLevelAtStart < 0 || batteryLevelAtStart > 100) {
            throw new IllegalArgumentException("batteryLevelAtStart must be between 0 and 100.");
        }

        if (batteryLevelAtEnd != null && (batteryLevelAtEnd < 0 || batteryLevelAtEnd > 100)) {
            throw new IllegalArgumentException("batteryLevelAtEnd must be between 0 and 100.");
        }

        if (status == RentalStatus.ENDED) {
            Objects.requireNonNull(endedAt, "endedAt is required when rental is ended.");
            Objects.requireNonNull(endLocation, "endLocation is required when rental is ended.");
            if (endedAt.isBefore(startedAt)) {
                throw new IllegalArgumentException("endedAt must be after startedAt.");
            }
        }
    }

    public static Rental start(UUID userId, String scooterId, GeoLocation startLocation, Instant startedAt, int batteryLevelAtStart) {
        return new Rental(
                UUID.randomUUID().toString(),
                userId,
                scooterId,
                RentalStatus.ACTIVE,
                startedAt,
                null,
                startLocation,
                null,
                batteryLevelAtStart,
                null
        );
    }

    public Rental end(GeoLocation endLocation, Instant endedAt, int batteryLevelAtEnd) {
        if (status != RentalStatus.ACTIVE) {
            throw new IllegalStateException("Only active rentals can be ended.");
        }

        return new Rental(
                rentalId,
                userId,
                scooterId,
                RentalStatus.ENDED,
                startedAt,
                endedAt,
                startLocation,
                endLocation,
                batteryLevelAtStart,
                batteryLevelAtEnd
        );
    }

    public long durationMinutes() {
        if (endedAt == null) {
            return 0;
        }
        return Duration.between(startedAt, endedAt).toMinutes();
    }
}
