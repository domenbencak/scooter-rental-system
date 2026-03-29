package com.scooterrental.rentalservice.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

public record StartRentalResponse(
        String rentalId,
        String status,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant startedAt
) {
}
