package com.scooterrental.rentalservice.application.port;

import com.scooterrental.rentalservice.domain.Rental;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface RentalRepository {

    Mono<Rental> save(Rental rental);

    Mono<Boolean> existsActiveRentalByUserId(UUID userId);

    Mono<Rental> findById(String rentalId);

    Flux<Rental> findActiveByUserId(UUID userId);
}
