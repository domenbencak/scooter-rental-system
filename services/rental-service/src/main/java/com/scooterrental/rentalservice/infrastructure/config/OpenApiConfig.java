package com.scooterrental.rentalservice.infrastructure.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Rental Service API",
                version = "1.0.0",
                description = "Reactive API for scooter rental lifecycle management.",
                contact = @Contact(name = "Scooter Rental System")
        )
)
public class OpenApiConfig {
}
