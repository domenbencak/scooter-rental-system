package com.scooterrental.rentalservice.infrastructure.persistence;

import com.scooterrental.rentalservice.application.port.RentalRepository;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.domain.Rental;
import com.scooterrental.rentalservice.domain.RentalStatus;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public class MongoRentalRepositoryAdapter implements RentalRepository {

    private final SpringDataRentalRepository repository;

    public MongoRentalRepositoryAdapter(SpringDataRentalRepository repository) {
        this.repository = repository;
    }

    @Override
    public Mono<Rental> save(Rental rental) {
        return repository.save(toDocument(rental))
                .map(MongoRentalRepositoryAdapter::toDomain);
    }

    @Override
    public Mono<Boolean> existsActiveRentalByUserId(UUID userId) {
        return repository.existsByUserIdAndStatus(userId.toString(), RentalStatus.ACTIVE);
    }

    @Override
    public Mono<Rental> findById(String rentalId) {
        return repository.findById(rentalId).map(MongoRentalRepositoryAdapter::toDomain);
    }

    @Override
    public Flux<Rental> findActiveByUserId(UUID userId) {
        return repository.findByUserIdAndStatusOrderByStartedAtDesc(userId.toString(), RentalStatus.ACTIVE)
                .map(MongoRentalRepositoryAdapter::toDomain);
    }

    static RentalDocument toDocument(Rental rental) {
        return new RentalDocument(
                rental.rentalId(),
                rental.userId().toString(),
                rental.scooterId(),
                rental.status(),
                rental.startedAt(),
                rental.endedAt(),
                toLocationDocument(rental.startLocation()),
                toLocationDocument(rental.endLocation()),
                rental.batteryLevelAtStart(),
                rental.batteryLevelAtEnd()
        );
    }

    static Rental toDomain(RentalDocument document) {
        return new Rental(
                document.getRentalId(),
                UUID.fromString(document.getUserId()),
                document.getScooterId(),
                document.getStatus(),
                document.getStartedAt(),
                document.getEndedAt(),
                toLocation(document.getStartLocation()),
                toLocation(document.getEndLocation()),
                document.getBatteryLevelAtStart(),
                document.getBatteryLevelAtEnd()
        );
    }

    private static GeoLocationDocument toLocationDocument(GeoLocation location) {
        if (location == null) {
            return null;
        }
        return new GeoLocationDocument(location.lat(), location.lon());
    }

    private static GeoLocation toLocation(GeoLocationDocument location) {
        if (location == null) {
            return null;
        }
        return new GeoLocation(location.getLat(), location.getLon());
    }
}
