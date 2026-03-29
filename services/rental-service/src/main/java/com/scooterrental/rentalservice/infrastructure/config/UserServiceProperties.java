package com.scooterrental.rentalservice.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.user-service")
public record UserServiceProperties(
        String baseUrl
) {
}
