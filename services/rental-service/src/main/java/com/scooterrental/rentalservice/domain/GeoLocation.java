package com.scooterrental.rentalservice.domain;

public record GeoLocation(double lat, double lon) {

    public GeoLocation {
        if (lat < -90 || lat > 90) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90.");
        }
        if (lon < -180 || lon > 180) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180.");
        }
    }
}
