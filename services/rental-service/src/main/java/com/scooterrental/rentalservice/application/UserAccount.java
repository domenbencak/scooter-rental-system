package com.scooterrental.rentalservice.application;

import java.util.UUID;

public record UserAccount(
        UUID userId,
        String status
) {
}
