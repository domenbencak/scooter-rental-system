package com.scooterrental.rentalservice.domain.exception;

import java.util.UUID;

public class UserNotFoundException extends RentalServiceException {

    public UserNotFoundException(UUID userId) {
        super("User '%s' was not found.".formatted(userId));
    }
}
