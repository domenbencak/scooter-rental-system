package com.scooterrental.rentalservice.interfaces.rest.dto;

public record ErrorResponse(
        String error,
        String message,
        String traceId
) {
}
