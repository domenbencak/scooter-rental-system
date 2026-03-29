package com.scooterrental.rentalservice.infrastructure.persistence;

import com.scooterrental.rentalservice.domain.RentalStatus;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface SpringDataRentalRepository extends ReactiveMongoRepository<RentalDocument, String> {

    Mono<Boolean> existsByUserIdAndStatus(String userId, RentalStatus status);

    Flux<RentalDocument> findByUserIdAndStatusOrderByStartedAtDesc(String userId, RentalStatus status);
}
