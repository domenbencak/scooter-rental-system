package com.scooterrental.rentalservice.interfaces.rest;

import com.scooterrental.rentalservice.domain.exception.ExternalServiceException;
import com.scooterrental.rentalservice.domain.exception.RentalNotFoundException;
import com.scooterrental.rentalservice.domain.exception.ScooterUnavailableException;
import com.scooterrental.rentalservice.domain.exception.UserAlreadyHasActiveRentalException;
import com.scooterrental.rentalservice.domain.exception.UserNotEligibleException;
import com.scooterrental.rentalservice.domain.exception.UserNotFoundException;
import com.scooterrental.rentalservice.infrastructure.config.RequestLoggingFilter;
import com.scooterrental.rentalservice.interfaces.rest.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ServerWebExchange;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<ErrorResponse> handleValidation(WebExchangeBindException exception, ServerWebExchange exchange) {
        String message = exception.getAllErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage() == null ? "Validation failed." : error.getDefaultMessage())
                .orElse("Validation failed.");
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, exchange);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException exception, ServerWebExchange exchange) {
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", exception.getMessage(), exchange);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException exception, ServerWebExchange exchange) {
        return buildResponse(HttpStatus.CONFLICT, "INVALID_RENTAL_STATE", exception.getMessage(), exchange);
    }

    @ExceptionHandler(UserAlreadyHasActiveRentalException.class)
    public ResponseEntity<ErrorResponse> handleActiveRentalConflict(
            UserAlreadyHasActiveRentalException exception,
            ServerWebExchange exchange
    ) {
        return buildResponse(HttpStatus.CONFLICT, "ACTIVE_RENTAL_EXISTS", exception.getMessage(), exchange);
    }

    @ExceptionHandler({ScooterUnavailableException.class, UserNotEligibleException.class})
    public ResponseEntity<ErrorResponse> handleBusinessConflict(RuntimeException exception, ServerWebExchange exchange) {
        return buildResponse(HttpStatus.CONFLICT, "BUSINESS_RULE_VIOLATION", exception.getMessage(), exchange);
    }

    @ExceptionHandler({RentalNotFoundException.class, UserNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException exception, ServerWebExchange exchange) {
        return buildResponse(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", exception.getMessage(), exchange);
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ErrorResponse> handleExternalService(ExternalServiceException exception, ServerWebExchange exchange) {
        return buildResponse(HttpStatus.BAD_GATEWAY, "DEPENDENCY_FAILURE", exception.getMessage(), exchange);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, ServerWebExchange exchange) {
        log.error("unexpected_error", exception);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal service error.", exchange);
    }

    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status,
            String error,
            String message,
            ServerWebExchange exchange
    ) {
        String traceId = exchange.getAttributeOrDefault(RequestLoggingFilter.TRACE_ID_ATTRIBUTE, "-");
        return ResponseEntity.status(status).body(new ErrorResponse(error, message, traceId));
    }
}
