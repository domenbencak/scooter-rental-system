package com.scooterrental.rentalservice.application;

import com.scooterrental.rentalservice.domain.GeoLocation;

public record ScooterSnapshot(
        String scooterId,
        String status,
        int batteryLevel,
        GeoLocation location
) {
}
