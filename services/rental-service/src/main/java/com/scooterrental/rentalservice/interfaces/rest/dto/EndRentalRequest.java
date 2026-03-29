package com.scooterrental.rentalservice.interfaces.rest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record EndRentalRequest(
        @NotNull @Valid LocationRequest endLocation,
        @Min(0) @Max(100) Integer batteryLevel
) {
}
