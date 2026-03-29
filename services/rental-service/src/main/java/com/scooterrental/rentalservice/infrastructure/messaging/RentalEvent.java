package com.scooterrental.rentalservice.infrastructure.messaging;

import java.time.Instant;

public record RentalEvent(
        String eventType,
        String rentalId,
        String userId,
        String scooterId,
        String status,
        Instant startedAt,
        Instant endedAt,
        EventLocation startLocation,
        EventLocation endLocation,
        long durationMinutes,
        Instant occurredAt
) {

    public record EventLocation(
            double lat,
            double lon
    ) {
    }
}
