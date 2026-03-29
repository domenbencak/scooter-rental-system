package com.scooterrental.rentalservice.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class RequestLoggingFilter implements WebFilter {

    public static final String TRACE_ID_ATTRIBUTE = "traceId";
    private static final String TRACE_HEADER = "X-Trace-Id";
    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String requestedTraceId = exchange.getRequest().getHeaders().getFirst(TRACE_HEADER);
        final String traceId = requestedTraceId == null || requestedTraceId.isBlank()
                ? UUID.randomUUID().toString()
                : requestedTraceId;

        long startedAt = System.currentTimeMillis();
        exchange.getAttributes().put(TRACE_ID_ATTRIBUTE, traceId);
        exchange.getResponse().getHeaders().add(TRACE_HEADER, traceId);

        log.info("request_started traceId={} method={} path={}",
                traceId,
                exchange.getRequest().getMethod(),
                exchange.getRequest().getPath().value());

        return chain.filter(exchange)
                .doFinally(signalType -> log.info("request_finished traceId={} method={} path={} status={} durationMs={}",
                        traceId,
                        exchange.getRequest().getMethod(),
                        exchange.getRequest().getPath().value(),
                        resolveStatus(exchange),
                        System.currentTimeMillis() - startedAt));
    }

    private String resolveStatus(ServerWebExchange exchange) {
        HttpStatusCode statusCode = exchange.getResponse().getStatusCode();
        if (statusCode != null) {
            return statusCode.toString();
        }
        return "200 OK";
    }
}
