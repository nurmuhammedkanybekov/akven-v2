package com.akven.thesis.notify;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.UnsupportedEncodingException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Delivers the outbox. With a mail server (MAIL_HOST and friends) each email is handed to it, and a refusal is tried
 * again later; without one, nothing leaves the shop and each email is marked "not sent", still readable in the admin.
 * One shop, one backend: a single sender is enough, so no locking between several instances is attempted.
 */
@Service
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final OutboundEmailRepository emails;
    private final ObjectProvider<JavaMailSender> mail;
    private final String from;
    private final String fromName;
    private final int keepDays;

    public EmailSender(OutboundEmailRepository emails, ObjectProvider<JavaMailSender> mail,
                       @Value("${akven.mail.from:akven.socks@gmail.com}") String from,
                       @Value("${akven.mail.from-name:AK&VEN}") String fromName,
                       @Value("${akven.mail.keep-days:90}") int keepDays) {
        this.emails = emails;
        this.mail = mail;
        this.from = from;
        this.fromName = fromName;
        this.keepDays = keepDays;
    }

    /** SMTP when a mail server is configured; OFF otherwise (Spring makes a sender even for an empty host). */
    public String mode() {
        return server() == null ? "OFF" : "SMTP";
    }

    private JavaMailSender server() {
        JavaMailSender s = mail.getIfAvailable();
        if (s instanceof JavaMailSenderImpl impl && (impl.getHost() == null || impl.getHost().isBlank())) return null;
        return s;
    }

    /** Sends what is due; returns how many emails it looked at. */
    @Transactional
    public int dispatch() {
        List<OutboundEmail> due = emails.findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(EmailStatus.QUEUED, Instant.now());
        JavaMailSender server = server();
        for (OutboundEmail e : due) {
            if (server == null) { e.keptUnsent(); continue; }
            try {
                MimeMessage m = server.createMimeMessage();
                MimeMessageHelper h = new MimeMessageHelper(m, false, "UTF-8");
                h.setFrom(from, fromName);
                h.setReplyTo(from);
                h.setTo(e.getTo());
                h.setSubject(e.getSubject());
                h.setText(e.getBody(), false);
                server.send(m);
                e.sent();
            } catch (MailException | MessagingException | UnsupportedEncodingException ex) {
                e.refused(ex.getMessage());
                log.warn("Email {} to the customer was refused ({} of {}): {}", e.getId(), e.getAttempts(), OutboundEmail.MAX_ATTEMPTS, ex.getMessage());
            }
        }
        emails.saveAll(due);
        return due.size();
    }

    /** Emails hold names and addresses: they are kept for keep-days (90 by default) and then deleted. */
    @Transactional
    public int forgetOld() {
        return emails.deleteOlderThan(Instant.now().minus(Duration.ofDays(keepDays)));
    }
}
