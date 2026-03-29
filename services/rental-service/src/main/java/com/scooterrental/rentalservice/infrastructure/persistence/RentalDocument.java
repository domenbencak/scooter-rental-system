package com.scooterrental.rentalservice.infrastructure.persistence;

import com.scooterrental.rentalservice.domain.RentalStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "rentals")
@CompoundIndex(def = "{'userId': 1, 'status': 1}")
public class RentalDocument {

    @Id
    private String rentalId;
    private String userId;
    private String scooterId;
    private RentalStatus status;
    private Instant startedAt;
    private Instant endedAt;
    private GeoLocationDocument startLocation;
    private GeoLocationDocument endLocation;
    private int batteryLevelAtStart;
    private Integer batteryLevelAtEnd;

    public RentalDocument() {
    }

    public RentalDocument(
            String rentalId,
            String userId,
            String scooterId,
            RentalStatus status,
            Instant startedAt,
            Instant endedAt,
            GeoLocationDocument startLocation,
            GeoLocationDocument endLocation,
            int batteryLevelAtStart,
            Integer batteryLevelAtEnd
    ) {
        this.rentalId = rentalId;
        this.userId = userId;
        this.scooterId = scooterId;
        this.status = status;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.startLocation = startLocation;
        this.endLocation = endLocation;
        this.batteryLevelAtStart = batteryLevelAtStart;
        this.batteryLevelAtEnd = batteryLevelAtEnd;
    }

    public String getRentalId() {
        return rentalId;
    }

    public void setRentalId(String rentalId) {
        this.rentalId = rentalId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getScooterId() {
        return scooterId;
    }

    public void setScooterId(String scooterId) {
        this.scooterId = scooterId;
    }

    public RentalStatus getStatus() {
        return status;
    }

    public void setStatus(RentalStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public GeoLocationDocument getStartLocation() {
        return startLocation;
    }

    public void setStartLocation(GeoLocationDocument startLocation) {
        this.startLocation = startLocation;
    }

    public GeoLocationDocument getEndLocation() {
        return endLocation;
    }

    public void setEndLocation(GeoLocationDocument endLocation) {
        this.endLocation = endLocation;
    }

    public int getBatteryLevelAtStart() {
        return batteryLevelAtStart;
    }

    public void setBatteryLevelAtStart(int batteryLevelAtStart) {
        this.batteryLevelAtStart = batteryLevelAtStart;
    }

    public Integer getBatteryLevelAtEnd() {
        return batteryLevelAtEnd;
    }

    public void setBatteryLevelAtEnd(Integer batteryLevelAtEnd) {
        this.batteryLevelAtEnd = batteryLevelAtEnd;
    }
}
