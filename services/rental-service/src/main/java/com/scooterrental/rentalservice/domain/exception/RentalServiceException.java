package com.scooterrental.rentalservice.domain.exception;

public class RentalServiceException extends RuntimeException {

    public RentalServiceException(String message) {
        super(message);
    }

    public RentalServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
