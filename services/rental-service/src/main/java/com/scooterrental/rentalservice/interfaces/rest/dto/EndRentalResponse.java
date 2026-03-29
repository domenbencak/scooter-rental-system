package com.scooterrental.rentalservice.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

public record EndRentalResponse(
        String rentalId,
        String status,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant endedAt,
        long durationMinutes
) {
}
