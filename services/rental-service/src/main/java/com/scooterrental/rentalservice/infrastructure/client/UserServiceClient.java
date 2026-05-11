package com.scooterrental.rentalservice.infrastructure.client;

import com.scooterrental.rentalservice.application.UserAccount;
import com.scooterrental.rentalservice.application.port.UserGateway;
import com.scooterrental.rentalservice.domain.exception.ExternalServiceException;
import com.scooterrental.rentalservice.domain.exception.UserNotFoundException;
import com.scooterrental.rentalservice.infrastructure.config.ResilienceProperties;
import com.scooterrental.rentalservice.infrastructure.resilience.DependencyCircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Duration;
import java.util.UUID;

@Component
public class UserServiceClient implements UserGateway {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final WebClient userServiceWebClient;
    private final DependencyCircuitBreaker userServiceCircuitBreaker;

    public UserServiceClient(
            WebClient userServiceWebClient,
            ResilienceProperties resilienceProperties,
            Clock clock
    ) {
        this.userServiceWebClient = userServiceWebClient;
        this.userServiceCircuitBreaker = new DependencyCircuitBreaker(
                "user-service",
                resilienceProperties.getUserService().getFailureThreshold(),
                Duration.ofSeconds(resilienceProperties.getUserService().getOpenStateDurationSeconds()),
                clock
        );
    }

    @Override
    public Mono<UserAccount> getUser(UUID userId) {
        return userServiceCircuitBreaker.execute(() -> userServiceWebClient.get()
                        .uri("/api/v1/users/{userId}", userId)
                        .retrieve()
                        .onStatus(status -> status.value() == 404, response -> Mono.error(new UserNotFoundException(userId)))
                        .onStatus(HttpStatusCode::isError, response -> toExternalServiceError("user-service", response))
                        .bodyToMono(UserServiceResponse.class)
                        .map(response -> new UserAccount(response.userId(), response.status()))
                        .doOnSubscribe(ignored -> log.info("user_validation_started userId={}", userId))
                        .doOnSuccess(user -> log.info("user_validation_completed userId={} status={}", userId, user.status()))
                        .onErrorMap(WebClientRequestException.class, error ->
                                new ExternalServiceException("Unable to reach user-service.", error)),
                this::isDependencyFailure
        );
    }

    private Mono<Throwable> toExternalServiceError(String dependency, ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> new ExternalServiceException(
                        "Dependency '%s' responded with HTTP %s. %s".formatted(
                                dependency,
                                response.statusCode().value(),
                                body
                        ).trim()
                ));
    }

    private record UserServiceResponse(
            UUID userId,
            String status
    ) {
    }

    private boolean isDependencyFailure(Throwable error) {
        return error instanceof ExternalServiceException;
    }
}
