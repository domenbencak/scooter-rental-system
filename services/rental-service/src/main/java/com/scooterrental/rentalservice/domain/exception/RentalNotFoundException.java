package com.scooterrental.rentalservice.domain.exception;

public class RentalNotFoundException extends RentalServiceException {

    public RentalNotFoundException(String rentalId) {
        super("Rental with id '%s' was not found.".formatted(rentalId));
    }
}
