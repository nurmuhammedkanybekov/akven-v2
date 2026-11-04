package com.akven.thesis.notify;

import com.akven.thesis.delivery.DeliveryKind;
import com.akven.thesis.order.FulfillmentMethod;
import com.akven.thesis.order.Order;
import com.akven.thesis.order.OrderItem;
import com.akven.thesis.order.OrderLinks;
import com.akven.thesis.payment.SimulatedWalletProvider;
import com.akven.thesis.shop.PickupPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Writes the emails to customers into the outbox, inside the caller's transaction: an order that rolls back sends
 * nothing. {@link EmailSender} delivers them afterwards. Only facts the shop knows go into an email: the customer's
 * own name, items and address, never text a stranger could have typed for someone else.
 */
@Service
public class Notifier {

    private final OutboundEmailRepository emails;
    private final EmailTemplates t;
    private final String publicUrl;
    private final OrderLinks links;

    public Notifier(OutboundEmailRepository emails, EmailTemplates templates, OrderLinks links,
                    @Value("${akven.public-url:http://localhost:8081}") String publicUrl) {
        this.emails = emails;
        this.t = templates;
        this.links = links;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    /** The order is paid: what was bought, the total, and how it reaches the customer. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void orderConfirmed(Order o) {
        String l = o.getLang();
        Map<String, Object> v = values(o);
        List<String> body = new ArrayList<>();
        body.add(t.text(l, "greeting", v));
        body.add("");
        body.add(t.text(l, "confirmed.intro", v));
        body.add("");
        body.add(t.text(l, "confirmed.items"));
        for (OrderItem i : o.getItems()) {
            Map<String, Object> line = new HashMap<>();
            line.put("qty", i.getQuantity());
            line.put("product", i.getProductName());
            line.put("variant", i.getVariantLabel() == null ? "" : i.getVariantLabel());
            line.put("price", money(i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()))));
            body.add("  " + t.text(l, "confirmed.item", line).replace(",  –", " –"));
        }
        if (o.getFulfillmentMethod() == FulfillmentMethod.DELIVERY) body.add(t.text(l, "confirmed.delivery", v));
        body.add(t.text(l, "confirmed.total", v));
        if (SimulatedWalletProvider.isSimulatedReference(o.getPaymentRef())) body.add(t.text(l, "demo"));
        body.add("");
        if (o.getFulfillmentMethod() == FulfillmentMethod.PICKUP) {
            body.add(t.text(l, "confirmed.pickup", v));
            if (o.getPickupPoint() != null && o.getPickupPoint().getHours() != null) body.add(t.text(l, "confirmed.hours", Map.of("hours", o.getPickupPoint().getHours())));
        } else if (o.getDeliveryKind() == DeliveryKind.CARGO) {
            body.add(t.text(l, "confirmed.cargo", v));
            if (o.isDeliveryPayOnReceipt()) body.add(t.text(l, "confirmed.cargoOnReceipt"));
        } else {
            body.add(t.text(l, "confirmed.courier", v));
        }
        if (o.getGiftBox() != null) body.add(t.text(l, "confirmed.gift"));
        if (o.isGuest()) { body.add(""); body.add(t.text(l, "confirmed.guest")); }
        queue(EmailKind.ORDER_CONFIRMED, o, t.text(l, "confirmed.subject", v), body);
    }

    /** The private link again, because the customer asked for it with the order's email and reference. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void orderLink(Order o) {
        String l = o.getLang();
        Map<String, Object> v = values(o);
        v.put("link", publicUrl + "/orders/" + o.getId() + "#t=" + links.tokenFor(o.getId()));
        List<String> body = List.of(t.text(l, "greeting", v), "", t.text(l, "orderLink.body", v), "", t.text(l, "orderLink.notYou"),
                "", t.text(l, "signature"));
        emails.save(new OutboundEmail(EmailKind.ORDER_LINK, o.getContactEmail(), l, t.text(l, "orderLink.subject", v), String.join("\n", body), o.getId()));
    }

    /** Collected at the stall, on its way with the courier, or with the cargo carrier. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void orderHandedOver(Order o) {
        String l = o.getLang();
        Map<String, Object> v = values(o);
        String way = o.getFulfillmentMethod() == FulfillmentMethod.PICKUP ? "PICKUP"
                : o.getDeliveryKind() == DeliveryKind.CARGO ? "CARGO" : "COURIER";
        queue(EmailKind.ORDER_HANDED_OVER, o, t.text(l, "handed.subject." + way, v),
                List.of(t.text(l, "greeting", v), "", t.text(l, "handed." + way, v)));
    }

    /** A paid order was cancelled and the money returned (an unpaid one never had a confirmation, so it gets nothing). */
    @Transactional(propagation = Propagation.MANDATORY)
    public void orderCancelled(Order o, boolean byShop) {
        String l = o.getLang();
        Map<String, Object> v = values(o);
        List<String> body = new ArrayList<>(List.of(t.text(l, "greeting", v), "", t.text(l, byShop ? "cancelled.shop" : "cancelled.mine", v)));
        body.add(SimulatedWalletProvider.isSimulatedReference(o.getPaymentRef()) ? t.text(l, "demo") : t.text(l, "cancelled.refund", v));
        queue(EmailKind.ORDER_CANCELLED, o, t.text(l, "cancelled.subject", v), body);
    }

    /** "We got it": only the reference and the number of pairs, so the form cannot carry someone else's words to a stranger. */
    @Transactional
    public void wholesaleReceived(String to, String lang, String reference, int pairs) {
        String l = lang(lang);
        Map<String, Object> v = Map.of("ref", reference, "pairs", pairs);
        List<String> body = List.of(t.text(l, "wholesale.body", v), "", t.text(l, "questions"), "", t.text(l, "signature"));
        emails.save(new OutboundEmail(EmailKind.WHOLESALE_RECEIVED, to, l, t.text(l, "wholesale.subject", v), String.join("\n", body), null));
    }

    private void queue(EmailKind kind, Order o, String subject, List<String> lines) {
        String to = o.getContactEmail();
        if (to == null || to.isBlank()) return;
        String l = o.getLang();
        List<String> body = new ArrayList<>(lines);
        body.add("");
        // A guest has no account to sign in to: the link carries its key (after the "#", never sent to a server).
        body.add(t.text(l, "link", Map.of("link", publicUrl + "/orders/" + o.getId() + (o.isGuest() ? "#t=" + links.tokenFor(o.getId()) : ""))));
        body.add(t.text(l, "questions"));
        body.add("");
        body.add(t.text(l, "signature"));
        // An area without days, or an order without a phone, leaves no empty brackets behind.
        String text = String.join("\n", body).replace(", )", ")").replace(" ()", "");
        emails.save(new OutboundEmail(kind, to, l, subject, text, o.getId()));
    }

    private Map<String, Object> values(Order o) {
        String l = o.getLang();
        Map<String, Object> v = new HashMap<>();
        v.put("name", o.getContactName() == null ? "" : o.getContactName());
        v.put("ref", o.getReference());
        v.put("total", money(o.getTotal()));
        v.put("fee", money(o.getDeliveryFee()));
        v.put("code", o.getPickupCode());
        v.put("place", place(o.getPickupPoint()));
        v.put("address", o.getDeliveryAddress());
        v.put("zone", o.getDeliveryZoneName());
        v.put("phone", o.getContactPhone());
        v.put("method", o.getPaymentMethod() == null ? "" : o.getPaymentMethod().equals("APPLE_PAY") ? "Apple Pay" : "Google Pay");
        Integer min = o.getDeliveryDaysMin(), max = o.getDeliveryDaysMax();
        v.put("days", min == null && max == null ? "" : Objects.equals(min, max) || min == null || max == null
                ? t.text(l, "days.same", Map.of("n", min == null ? max : min)) : t.text(l, "days", Map.of("min", min, "max", max)));
        return v;
    }

    private static String place(PickupPoint p) {
        if (p == null) return "Dordoi Bazaar, 70-E, Bishkek";
        return Stream.of(p.getMarket(), p.getContainer(), p.getCity()).filter(s -> s != null && !s.isBlank()).collect(Collectors.joining(", "));
    }

    static String money(BigDecimal amount) {
        return "$" + (amount == null ? BigDecimal.ZERO : amount).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    static String lang(String lang) {
        return lang != null && EmailTemplates.LANGS.contains(lang) ? lang : "en";
    }
}
