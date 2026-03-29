package com.scooterrental.rentalservice.application.port;

import com.scooterrental.rentalservice.application.UserAccount;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface UserGateway {

    Mono<UserAccount> getUser(UUID userId);
}
