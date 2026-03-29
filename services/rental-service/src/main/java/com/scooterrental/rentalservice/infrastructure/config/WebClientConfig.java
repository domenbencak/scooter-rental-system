package com.scooterrental.rentalservice.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    WebClient userServiceWebClient(WebClient.Builder builder, UserServiceProperties userServiceProperties) {
        return builder
                .baseUrl(userServiceProperties.baseUrl())
                .build();
    }
}
