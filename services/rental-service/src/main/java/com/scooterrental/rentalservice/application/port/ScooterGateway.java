package com.scooterrental.rentalservice.application.port;

import com.scooterrental.rentalservice.application.ScooterSnapshot;
import com.scooterrental.rentalservice.domain.GeoLocation;
import reactor.core.publisher.Mono;

public interface ScooterGateway {

    Mono<ScooterSnapshot> reserveScooterForRental(String scooterId, GeoLocation location);

    Mono<ScooterSnapshot> releaseScooterFromRental(String scooterId, GeoLocation location, int batteryLevel);
}
