package com.akven.thesis.config;

import com.akven.thesis.media.MediaStorage;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

/**
 * Serves uploaded product photos at /media/uploads/**. File names are random UUIDs and never change
 * content, so browsers and the service worker may cache them for a long time.
 */
@Configuration
public class MediaWebConfig implements WebMvcConfigurer {

    private final MediaStorage storage;

    public MediaWebConfig(MediaStorage storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(MediaStorage.URL_PREFIX + "**")
                .addResourceLocations(storage.uploadDir().toUri().toString())
                .setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic().immutable());
    }
}
