package com.scooterrental.rentalservice.interfaces.rest.dto;

import java.util.List;

public record ActiveRentalsResponse(
        List<ActiveRentalItemResponse> items
) {
}
