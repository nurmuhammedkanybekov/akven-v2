package com.akven.thesis.notify;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Runs the sender every few seconds and the clean-up once a day. Switched off in the tests, which call the sender themselves. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "akven.mail.scheduler", havingValue = "on", matchIfMissing = true)
public class EmailScheduler {

    private final EmailSender sender;

    public EmailScheduler(EmailSender sender) {
        this.sender = sender;
    }

    @Scheduled(fixedDelayString = "${akven.mail.poll-ms:5000}", initialDelay = 5000)
    void send() {
        sender.dispatch();
    }

    @Scheduled(cron = "0 17 3 * * *")
    void forget() {
        sender.forgetOld();
    }
}
