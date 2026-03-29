package com.scooterrental.rentalservice.domain.exception;

public class ExternalServiceException extends RentalServiceException {

    public ExternalServiceException(String message) {
        super(message);
    }

    public ExternalServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
