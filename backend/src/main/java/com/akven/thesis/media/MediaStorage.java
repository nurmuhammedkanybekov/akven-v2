package com.akven.thesis.media;

import com.akven.thesis.common.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Stores product photos uploaded from the admin panel.
 *
 * Safety rules, because this is the one place the public internet's bytes land on our disk:
 * <ul>
 *   <li>the type is decided by the file's CONTENT (magic bytes), never by its name or declared type;</li>
 *   <li>only JPEG, PNG and WebP are accepted. SVG is refused on purpose: it can carry scripts;</li>
 *   <li>the stored name is a random UUID plus the extension WE choose, so a client can never pick
 *       a path or overwrite a file (no path traversal is possible);</li>
 *   <li>size is capped (5 MB) and empty files are refused.</li>
 * </ul>
 * Files live under akven.media.dir/uploads and are served at /media/uploads/** (see MediaWebConfig).
 * Swapping this class for an object store (S3, R2) later changes nothing else in the application.
 */
@Service
public class MediaStorage {

    public static final String URL_PREFIX = "/media/uploads/";
    static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Logger log = LoggerFactory.getLogger(MediaStorage.class);

    private final Path uploadDir;

    public MediaStorage(@Value("${akven.media.dir:./data/media}") String mediaDir) {
        this.uploadDir = Path.of(mediaDir).toAbsolutePath().normalize().resolve("uploads");
        try {
            // Must exist before the web layer maps it: Path.toUri() only ends in "/" for an existing directory,
            // and without the slash Spring would treat the location as a single file and serve nothing.
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create the media directory " + uploadDir, e);
        }
    }

    public Path uploadDir() {
        return uploadDir;
    }

    /** Validates and stores the file; returns the public URL path, e.g. /media/uploads/3f2a....jpg */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException("Choose a photo to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessRuleException("The photo is larger than 5 MB.");
        }
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(16);
            String extension = detectExtension(head);
            if (extension == null) {
                throw new BusinessRuleException("Only JPEG, PNG and WebP photos are accepted.");
            }
            Files.createDirectories(uploadDir);
            String name = UUID.randomUUID() + "." + extension;
            Path target = uploadDir.resolve(name).normalize();
            if (!target.startsWith(uploadDir)) {                // defensive: cannot happen with a UUID name
                throw new BusinessRuleException("Invalid file name.");
            }
            try (InputStream again = file.getInputStream()) {
                Files.copy(again, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return URL_PREFIX + name;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store the uploaded photo", e);
        }
    }

    /** Removes a previously uploaded file. Quiet by design: a missing file must never fail a catalog edit. */
    public void deleteQuietly(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) {
            return;                                             // not one of ours (e.g. a demo illustration)
        }
        Path target = uploadDir.resolve(url.substring(URL_PREFIX.length())).normalize();
        if (!target.startsWith(uploadDir)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete uploaded file {}", target, e);
        }
    }

    /** JPEG: FF D8 FF. PNG: 89 50 4E 47 0D 0A 1A 0A. WebP: "RIFF" .... "WEBP". */
    static String detectExtension(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) {
            return "png";
        }
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return "webp";
        }
        return null;
    }
}
