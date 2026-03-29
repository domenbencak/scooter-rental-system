package com.scooterrental.rentalservice.infrastructure.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.domain.Rental;
import com.scooterrental.rentalservice.domain.RentalStatus;
import com.scooterrental.rentalservice.infrastructure.config.MessagingProperties;
import org.junit.jupiter.api.Test;
import org.springframework.jms.core.JmsTemplate;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ActiveMqRentalEventPublisherTest {

    @Test
    void shouldPublishRentalStartedEventToTopic() {
        JmsTemplate jmsTemplate = mock(JmsTemplate.class);
        ActiveMqRentalEventPublisher publisher = new ActiveMqRentalEventPublisher(
                jmsTemplate,
                new MessagingProperties("rental.lifecycle"),
                new ObjectMapper().findAndRegisterModules()
        );

        Rental rental = new Rental(
                "rental-1",
                UUID.randomUUID(),
                "SCOOTER-1",
                RentalStatus.ACTIVE,
                Instant.parse("2026-03-28T10:15:30Z"),
                null,
                new GeoLocation(46.5547, 15.6459),
                null,
                90,
                null
        );

        StepVerifier.create(publisher.publishRentalStarted(rental))
                .verifyComplete();

        verify(jmsTemplate).convertAndSend(eq("rental.lifecycle"), anyString(), any());
    }
}
