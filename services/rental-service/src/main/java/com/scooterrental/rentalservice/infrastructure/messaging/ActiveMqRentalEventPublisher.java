package com.scooterrental.rentalservice.infrastructure.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scooterrental.rentalservice.application.port.RentalEventPublisher;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.domain.Rental;
import com.scooterrental.rentalservice.infrastructure.config.MessagingProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Instant;

@Component
public class ActiveMqRentalEventPublisher implements RentalEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ActiveMqRentalEventPublisher.class);

    private final JmsTemplate jmsTemplate;
    private final MessagingProperties messagingProperties;
    private final ObjectMapper objectMapper;

    public ActiveMqRentalEventPublisher(
            JmsTemplate jmsTemplate,
            MessagingProperties messagingProperties,
            ObjectMapper objectMapper
    ) {
        this.jmsTemplate = jmsTemplate;
        this.messagingProperties = messagingProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> publishRentalStarted(Rental rental) {
        return publish("rental.started", rental);
    }

    @Override
    public Mono<Void> publishRentalEnded(Rental rental) {
        return publish("rental.ended", rental);
    }

    private Mono<Void> publish(String eventType, Rental rental) {
        return Mono.fromRunnable(() -> {
                    String payload = toJson(buildEvent(eventType, rental));
                    jmsTemplate.convertAndSend(messagingProperties.rentalTopic(), payload, message -> {
                        message.setStringProperty("eventType", eventType);
                        message.setStringProperty("rentalId", rental.rentalId());
                        return message;
                    });
                    log.info("rental_event_published eventType={} rentalId={} destination={}",
                            eventType,
                            rental.rentalId(),
                            messagingProperties.rentalTopic());
                })
                .subscribeOn(Schedulers.boundedElastic())
                .then();
    }

    private RentalEvent buildEvent(String eventType, Rental rental) {
        return new RentalEvent(
                eventType,
                rental.rentalId(),
                rental.userId().toString(),
                rental.scooterId(),
                rental.status().name(),
                rental.startedAt(),
                rental.endedAt(),
                toEventLocation(rental.startLocation()),
                toEventLocation(rental.endLocation()),
                rental.durationMinutes(),
                Instant.now()
        );
    }

    private RentalEvent.EventLocation toEventLocation(GeoLocation location) {
        if (location == null) {
            return null;
        }
        return new RentalEvent.EventLocation(location.lat(), location.lon());
    }

    private String toJson(RentalEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize rental event.", exception);
        }
    }
}
