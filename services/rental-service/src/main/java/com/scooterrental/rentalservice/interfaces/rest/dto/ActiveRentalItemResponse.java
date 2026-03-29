package com.scooterrental.rentalservice.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.UUID;

public record ActiveRentalItemResponse(
        String rentalId,
        UUID userId,
        String scooterId,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant startedAt
) {
}
