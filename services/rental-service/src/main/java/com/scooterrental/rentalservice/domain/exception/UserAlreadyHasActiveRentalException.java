package com.scooterrental.rentalservice.domain.exception;

import java.util.UUID;

public class UserAlreadyHasActiveRentalException extends RentalServiceException {

    public UserAlreadyHasActiveRentalException(UUID userId) {
        super("User '%s' already has an active rental.".formatted(userId));
    }
}
