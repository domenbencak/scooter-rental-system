package com.scooterrental.rentalservice.interfaces.rest;

import com.scooterrental.rentalservice.application.EndRentalCommand;
import com.scooterrental.rentalservice.application.StartRentalCommand;
import com.scooterrental.rentalservice.application.service.RentalApplicationService;
import com.scooterrental.rentalservice.domain.GeoLocation;
import com.scooterrental.rentalservice.interfaces.rest.dto.ActiveRentalItemResponse;
import com.scooterrental.rentalservice.interfaces.rest.dto.ActiveRentalsResponse;
import com.scooterrental.rentalservice.interfaces.rest.dto.EndRentalRequest;
import com.scooterrental.rentalservice.interfaces.rest.dto.EndRentalResponse;
import com.scooterrental.rentalservice.interfaces.rest.dto.StartRentalRequest;
import com.scooterrental.rentalservice.interfaces.rest.dto.StartRentalResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/v1/rentals")
@Tag(name = "Rentals")
public class RentalController {

    private final RentalApplicationService rentalApplicationService;

    public RentalController(RentalApplicationService rentalApplicationService) {
        this.rentalApplicationService = rentalApplicationService;
    }

    @PostMapping("/start")
    @Operation(summary = "Start a new scooter rental")
    public Mono<ResponseEntity<StartRentalResponse>> startRental(@Valid @RequestBody StartRentalRequest request) {
        return rentalApplicationService.startRental(new StartRentalCommand(
                        request.userId(),
                        request.scooterId(),
                        new GeoLocation(request.startLocation().lat(), request.startLocation().lon())
                ))
                .map(rental -> ResponseEntity.status(HttpStatus.CREATED).body(new StartRentalResponse(
                        rental.rentalId(),
                        rental.status().name(),
                        rental.startedAt()
                )));
    }

    @PostMapping("/{rentalId}/end")
    @Operation(summary = "End an active rental")
    public Mono<EndRentalResponse> endRental(
            @PathVariable String rentalId,
            @Valid @RequestBody EndRentalRequest request
    ) {
        return rentalApplicationService.endRental(rentalId, new EndRentalCommand(
                        new GeoLocation(request.endLocation().lat(), request.endLocation().lon()),
                        request.batteryLevel()
                ))
                .map(rental -> new EndRentalResponse(
                        rental.rentalId(),
                        rental.status().name(),
                        rental.endedAt(),
                        rental.durationMinutes()
                ));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active rentals for a user")
    public Mono<ActiveRentalsResponse> getActiveRentals(@RequestParam UUID userId) {
        return rentalApplicationService.getActiveRentals(userId)
                .map(rental -> new ActiveRentalItemResponse(
                        rental.rentalId(),
                        rental.userId(),
                        rental.scooterId(),
                        rental.startedAt()
                ))
                .collectList()
                .map(ActiveRentalsResponse::new);
    }
}
