package com.scooterrental.rentalservice.interfaces.rest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StartRentalRequest(
        @NotNull UUID userId,
        @NotBlank String scooterId,
        @NotNull @Valid LocationRequest startLocation
) {
}
