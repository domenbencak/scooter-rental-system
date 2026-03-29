package com.scooterrental.rentalservice.application;

import com.scooterrental.rentalservice.domain.GeoLocation;

public record EndRentalCommand(
        GeoLocation endLocation,
        Integer batteryLevel
) {
}
