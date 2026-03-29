package com.scooterrental.rentalservice.domain.exception;

import java.util.UUID;

public class UserNotEligibleException extends RentalServiceException {

    public UserNotEligibleException(UUID userId, String status) {
        super("User '%s' is not eligible for rental. Status: %s.".formatted(userId, status));
    }
}
