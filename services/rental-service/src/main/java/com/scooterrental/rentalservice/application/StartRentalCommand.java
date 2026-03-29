package com.scooterrental.rentalservice.application;

import com.scooterrental.rentalservice.domain.GeoLocation;

import java.util.UUID;

public record StartRentalCommand(
        UUID userId,
        String scooterId,
        GeoLocation startLocation
) {
}
