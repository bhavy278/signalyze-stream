package com.signalyze.ingest.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicsConfig {
    
    public static final String DOCUMENT_UPLOADED = "document.uploaded";
    public static final String DOCUMENT_PROCESSED = "document.processed";
    public static final String DOCUMENT_FAILED="document.failed";

    @Bean
    public NewTopic documentUploaded(){
        return TopicBuilder.name(DOCUMENT_UPLOADED)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic documentProcessed(){
        return TopicBuilder.name(DOCUMENT_PROCESSED)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic documentFailed(){
        return TopicBuilder.name(DOCUMENT_FAILED)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
