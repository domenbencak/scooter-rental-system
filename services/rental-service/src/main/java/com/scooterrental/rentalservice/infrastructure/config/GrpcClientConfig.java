package com.scooterrental.rentalservice.infrastructure.config;

import com.scooterrental.rentalservice.scooteravailability.ScooterAvailabilityServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GrpcClientConfig {

    @Bean(destroyMethod = "shutdownNow")
    ManagedChannel scooterAvailabilityChannel(ScooterServiceProperties properties) {
        return ManagedChannelBuilder.forAddress(properties.host(), properties.port())
                .usePlaintext()
                .build();
    }

    @Bean
    ScooterAvailabilityServiceGrpc.ScooterAvailabilityServiceStub scooterAvailabilityStub(ManagedChannel scooterAvailabilityChannel) {
        return ScooterAvailabilityServiceGrpc.newStub(scooterAvailabilityChannel);
    }
}
