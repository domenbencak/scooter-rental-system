package com.scooterrental.rentalservice.infrastructure.persistence;

public class GeoLocationDocument {

    private double lat;
    private double lon;

    public GeoLocationDocument() {
    }

    public GeoLocationDocument(double lat, double lon) {
        this.lat = lat;
        this.lon = lon;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }

    public double getLon() {
        return lon;
    }

    public void setLon(double lon) {
        this.lon = lon;
    }
}
