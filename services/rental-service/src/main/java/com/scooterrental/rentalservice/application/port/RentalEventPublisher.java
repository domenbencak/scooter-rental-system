package com.scooterrental.rentalservice.application.port;

import com.scooterrental.rentalservice.domain.Rental;
import reactor.core.publisher.Mono;

public interface RentalEventPublisher {

    Mono<Void> publishRentalStarted(Rental rental);

    Mono<Void> publishRentalEnded(Rental rental);
}
