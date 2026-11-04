package com.akven.thesis.notify;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Emails to customers: written with the order, in the customer's language, and delivered (or kept) by the sender. */
class EmailNotificationTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private OutboundEmailRepository emails;
    @Autowired private EmailSender sender;
    @Autowired private EmailTemplates templates;
    @Autowired private JdbcTemplate jdbc;

    private ResultActions buy(String bearer, Variant v, int qty, Map<String, Object> fulfilment, String lang, String token) throws Exception {
        Map<String, Object> f = new HashMap<>(Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996 700 123 456"));
        f.putAll(fulfilment);
        Map<String, Object> body = new HashMap<>(Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", qty)), "fulfillment", f,
                "payment", Map.of("method", "APPLE_PAY", "token", token)));
        if (lang != null) body.put("lang", lang);
        return mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    private static String token() {
        return "sim_apple_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String email() {
        return "mail-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test";
    }

    private List<OutboundEmail> about(String orderId) {
        return emails.findByOrderIdOrderByCreatedAtAsc(UUID.fromString(orderId));
    }

    @Test
    void aPaidOrderIsConfirmedInTheCustomersLanguageWithThePickupCode() throws Exception {
        String to = email();
        JsonNode order = json(buy(tokenForEmail(to, Role.CUSTOMER), data.variant(10), 2, Map.of(), "ru", token()).andExpect(status().isCreated()));
        List<OutboundEmail> sent = about(order.get("id").asText());
        assertThat(sent).hasSize(1);
        OutboundEmail e = sent.get(0);
        assertThat(e.getKind()).isEqualTo(EmailKind.ORDER_CONFIRMED);
        assertThat(e.getTo()).isEqualTo(to);
        assertThat(e.getLang()).isEqualTo("ru");
        assertThat(e.getStatus()).isEqualTo(EmailStatus.QUEUED);
        assertThat(e.getSubject()).contains(order.get("reference").asText()).contains("подтверждён");
        assertThat(e.getBody())
                .contains("Здравствуйте, Aida!")
                .contains(order.at("/fulfillment/pickupCode").asText())
                .contains("$20.00")
                .contains("демо-оплата")                                   // the demo wallet says so, in the email too
                .contains("/orders/" + order.get("id").asText())
                .doesNotContain("{").doesNotContain("null");
    }

    @Test
    void aFailedPaymentSendsNothingAndAnOrderWithoutALanguageIsInEnglish() throws Exception {
        String bearer = tokenForEmail(email(), Role.CUSTOMER);
        JsonNode failed = json(buy(bearer, data.variant(10), 1, Map.of(), null, "sim_apple_declined0000").andExpect(status().isPaymentRequired()));
        assertThat(about(failed.at("/order/id").asText())).isEmpty();

        JsonNode ok = json(buy(bearer, data.variant(10), 1, Map.of(), "xx", token()).andExpect(status().isBadRequest()));
        assertThat(ok.get("fieldCodes")).isNotNull();
        JsonNode en = json(buy(bearer, data.variant(10), 1, Map.of(), null, token()).andExpect(status().isCreated()));
        assertThat(about(en.get("id").asText()).get(0).getSubject()).startsWith("Order " + en.get("reference").asText() + " is confirmed");
    }

    @Test
    void cargoSaysWhoIsPaidAndTheHandOverAndTheCancellationAreReported() throws Exception {
        String owner = tokenFor(Role.ADMIN);
        Map<String, Object> zone = new HashMap<>(Map.of("country", "KG", "name", "Bus cargo " + UUID.randomUUID().toString().substring(0, 5),
                "fee", "0.00", "daysMin", 2, "daysMax", 4, "active", true, "position", 9, "kind", "CARGO", "payOnReceipt", true));
        String zoneId = json(sendJson("POST", "/api/admin/delivery-zones", owner, zone).andExpect(status().isCreated())).get("id").asText();

        String bearer = tokenForEmail(email(), Role.CUSTOMER);
        JsonNode cargo = json(buy(bearer, data.variant(10), 2, Map.of("method", "DELIVERY", "zoneId", zoneId, "address", "Osh, bus station, Aida"),
                "ky", token()).andExpect(status().isCreated()));
        String id = cargo.get("id").asText();
        assertThat(about(id).get(0).getBody()).contains("Osh, bus station, Aida").contains("2–4 күн").contains("алганда төлөйсүз");

        sendJson("POST", "/api/admin/orders/" + id + "/fulfil", tokenFor(Role.STAFF), Map.of()).andExpect(status().isOk());
        OutboundEmail handed = about(id).get(1);
        assertThat(handed.getKind()).isEqualTo(EmailKind.ORDER_HANDED_OVER);
        assertThat(handed.getSubject()).contains("ташуучуга");

        // a paid order cancelled by the customer: the refund is reported (here: the demo payment was returned)
        JsonNode pickup = json(buy(bearer, data.variant(10), 1, Map.of(), "en", token()).andExpect(status().isCreated()));
        sendJson("POST", "/api/orders/" + pickup.get("id").asText() + "/cancel", bearer, Map.of()).andExpect(status().isOk());
        OutboundEmail cancelled = about(pickup.get("id").asText()).get(1);
        assertThat(cancelled.getKind()).isEqualTo(EmailKind.ORDER_CANCELLED);
        assertThat(cancelled.getBody()).contains("You cancelled order").contains("demo payment");
    }

    @Test
    void aWholesaleRequestByEmailIsAcknowledgedWithoutTheWordsTheVisitorTyped() throws Exception {
        Map<String, Object> request = new HashMap<>(Map.of("kind", "WHOLESALE", "company", "Buy cheap pills at spam.example", "contactKind", "EMAIL",
                "contact", "shop-" + UUID.randomUUID().toString().substring(0, 6) + "@example.com", "pairs", 120, "lang", "ru"));
        String ref = json(sendJson("POST", "/api/wholesale/requests", null, request).andExpect(status().isCreated())).get("reference").asText();
        OutboundEmail e = emails.findAll().stream().filter(x -> x.getSubject().contains(ref)).findFirst().orElseThrow();
        assertThat(e.getKind()).isEqualTo(EmailKind.WHOLESALE_RECEIVED);
        assertThat(e.getTo()).isEqualTo(request.get("contact"));
        assertThat(e.getBody()).contains("120").doesNotContain("spam");

        request.put("contactKind", "TELEGRAM");
        request.put("contact", "@akven_shop_test");
        long before = emails.count();
        sendJson("POST", "/api/wholesale/requests", null, request).andExpect(status().isCreated());
        assertThat(emails.count()).isEqualTo(before);
    }

    @Test
    void withoutAMailServerNothingLeavesAndTheEmailIsKept() throws Exception {
        JsonNode order = json(buy(tokenForEmail(email(), Role.CUSTOMER), data.variant(10), 1, Map.of(), null, token()).andExpect(status().isCreated()));
        assertThat(sender.mode()).isEqualTo("OFF");
        sender.dispatch();
        OutboundEmail e = about(order.get("id").asText()).get(0);
        assertThat(e.getStatus()).isEqualTo(EmailStatus.NOT_SENT);
        assertThat(e.getLastError()).contains("MAIL_HOST");

        // the staff see it, and can put it back in the queue; a customer cannot see the list at all
        getJson("/api/admin/emails", tokenForEmail(email(), Role.CUSTOMER)).andExpect(status().isForbidden());
        JsonNode list = json(getJson("/api/admin/emails?status=NOT_SENT", tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(list.get("mode").asText()).isEqualTo("OFF");
        assertThat(list.at("/emails/items/0/status").asText()).isEqualTo("NOT_SENT");
        JsonNode forOrder = json(getJson("/api/admin/emails?orderId=" + order.get("id").asText(), tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(forOrder).hasSize(1);
        sendJson("POST", "/api/admin/emails/" + e.getId() + "/retry", tokenFor(Role.STAFF), Map.of()).andExpect(status().isOk());
        assertThat(emails.findById(e.getId()).orElseThrow().getStatus()).isEqualTo(EmailStatus.QUEUED);
        sendJson("POST", "/api/admin/emails/" + e.getId() + "/retry", tokenFor(Role.STAFF), Map.of()).andExpect(status().isBadRequest());
    }

    /** A mail server stand-in: records what it was given, or refuses everything. */
    static final class FakeServer extends JavaMailSenderImpl {
        final List<MimeMessage> got = new ArrayList<>();
        boolean refuse;
        FakeServer() { setHost("smtp.test"); }
        @Override public MimeMessage createMimeMessage() { return new MimeMessage(Session.getInstance(new Properties())); }
        @Override public void send(MimeMessage... messages) {
            if (refuse) throw new MailSendException("421 try again later");
            got.addAll(List.of(messages));
        }
    }

    @Test
    void aMailServerGetsTheEmailAndARefusalIsTriedAgainThenGivenUp() throws Exception {
        FakeServer server = new FakeServer();
        StaticListableBeanFactory beans = new StaticListableBeanFactory(Map.of("mail", server));
        EmailSender smtp = new EmailSender(emails, beans.getBeanProvider(JavaMailSender.class), "akven.socks@gmail.com", "AK&VEN", 90);
        assertThat(smtp.mode()).isEqualTo("SMTP");

        emails.findAll().forEach(e -> { if (e.getStatus() == EmailStatus.QUEUED) jdbc.update("update outbound_email set status = 'NOT_SENT' where id = ?", e.getId()); });
        JsonNode order = json(buy(tokenForEmail(email(), Role.CUSTOMER), data.variant(10), 1, Map.of(), "ky", token()).andExpect(status().isCreated()));
        UUID id = about(order.get("id").asText()).get(0).getId();
        smtp.dispatch();
        assertThat(emails.findById(id).orElseThrow().getStatus()).isEqualTo(EmailStatus.SENT);
        MimeMessage m = server.got.get(0);
        assertThat(m.getSubject()).contains("ырасталды");                     // Kyrgyz survives the trip (UTF-8)
        assertThat(m.getFrom()[0].toString()).contains("akven.socks@gmail.com");

        server.refuse = true;
        JsonNode second = json(buy(tokenForEmail(email(), Role.CUSTOMER), data.variant(10), 1, Map.of(), null, token()).andExpect(status().isCreated()));
        UUID id2 = about(second.get("id").asText()).get(0).getId();
        for (int i = 0; i < OutboundEmail.MAX_ATTEMPTS; i++) {
            jdbc.update("update outbound_email set next_attempt_at = now() where id = ?", id2);   // skip the wait between tries
            smtp.dispatch();
        }
        OutboundEmail gaveUp = emails.findById(id2).orElseThrow();
        assertThat(gaveUp.getStatus()).isEqualTo(EmailStatus.FAILED);
        assertThat(gaveUp.getAttempts()).isEqualTo(OutboundEmail.MAX_ATTEMPTS);
        assertThat(gaveUp.getLastError()).contains("421");
    }

    @Test
    void oldEmailsAreForgotten() throws Exception {
        JsonNode order = json(buy(tokenForEmail(email(), Role.CUSTOMER), data.variant(10), 1, Map.of(), null, token()).andExpect(status().isCreated()));
        UUID id = about(order.get("id").asText()).get(0).getId();
        jdbc.update("update outbound_email set created_at = dateadd('DAY', -91, now()) where id = ?", id);
        assertThat(sender.forgetOld()).isGreaterThanOrEqualTo(1);
        assertThat(emails.findById(id)).isEmpty();
    }

    @Test
    void everyEmailTextExistsInEnglishRussianAndKyrgyz() {
        Set<String> en = new HashSet<>(templates.all().get("en").stringPropertyNames());
        for (String lang : List.of("ru", "ky")) {
            assertThat(templates.all().get(lang).stringPropertyNames()).as(lang).containsExactlyInAnyOrderElementsOf(en);
        }
    }
}
