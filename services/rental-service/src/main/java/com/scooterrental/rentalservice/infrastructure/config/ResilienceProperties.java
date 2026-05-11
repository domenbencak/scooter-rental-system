package com.scooterrental.rentalservice.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.resilience")
public class ResilienceProperties {

    private final Dependency userService = new Dependency();
    private final Dependency scooterService = new Dependency();

    public Dependency getUserService() {
        return userService;
    }

    public Dependency getScooterService() {
        return scooterService;
    }

    public static class Dependency {
        private int failureThreshold = 3;
        private int openStateDurationSeconds = 20;

        public int getFailureThreshold() {
            return failureThreshold;
        }

        public void setFailureThreshold(int failureThreshold) {
            this.failureThreshold = failureThreshold;
        }

        public int getOpenStateDurationSeconds() {
            return openStateDurationSeconds;
        }

        public void setOpenStateDurationSeconds(int openStateDurationSeconds) {
            this.openStateDurationSeconds = openStateDurationSeconds;
        }
    }
}
