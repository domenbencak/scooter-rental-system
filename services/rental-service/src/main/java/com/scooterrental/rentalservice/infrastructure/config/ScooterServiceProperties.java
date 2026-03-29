package com.scooterrental.rentalservice.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.scooter-service")
public record ScooterServiceProperties(
        String host,
        int port,
        int availabilityRadiusMeters
) {
}
