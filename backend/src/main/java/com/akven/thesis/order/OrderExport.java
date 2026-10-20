package com.akven.thesis.order;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.CatalogService;
import com.akven.thesis.common.BusinessRuleException;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The orders of the last N days as a CSV file the owners open in Excel or Google Sheets: one line per order, the items
 * written out. It holds customers' names and phones, so it is for the owners only and every export is in the audit log.
 * Cells that a spreadsheet would read as a formula (starting with = + - @, a tab or a return) get a leading apostrophe,
 * so text a customer typed can never run in the owners' spreadsheet (CSV injection).
 */
@Service
public class OrderExport {

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(CatalogService.SHOP_ZONE);

    private final OrderRepository orders;
    private final AuditService audit;

    public OrderExport(OrderRepository orders, AuditService audit) {
        this.orders = orders;
        this.audit = audit;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public String csv(String actorEmail, int days) {
        if (days < 1 || days > 366) throw new BusinessRuleException("Choose between 1 and 366 days.");
        Instant since = LocalDate.now(CatalogService.SHOP_ZONE).minusDays(days - 1L).atStartOfDay(CatalogService.SHOP_ZONE).toInstant();
        List<Order> list = orders.findAll(Sort.by(Sort.Order.desc("createdAt"))).stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(since)).toList();
        StringBuilder out = new StringBuilder("\uFEFF");                    // so Excel reads Cyrillic names correctly
        out.append(String.join(",", "Reference", "Placed (Bishkek)", "Status", "Total USD", "Customer email", "Contact name", "Phone",
                "Receive", "Country", "Address", "Items", "Gift box", "Gift card", "Note")).append("\r\n");
        for (Order o : list) {
            String items = o.getItems().stream().map(i -> i.getQuantity() + " x " + i.getProductName() + " (" + i.getVariantLabel() + ")")
                    .collect(Collectors.joining("; "));
            String gift = o.getGiftBox() == null ? "" : o.getGiftBox() + " / " + o.getGiftRibbon() + (o.getGiftTo() == null ? "" : " / to " + o.getGiftTo());
            out.append(String.join(",", List.of(o.getReference(), WHEN.format(o.getCreatedAt()), o.getStatus().name(), o.getTotal().toPlainString(),
                    o.getCustomer().getEmail(), nz(o.getContactName()), nz(o.getContactPhone()), o.getFulfillmentMethod().name(),
                    o.getDeliveryCountry() == null ? "" : o.getDeliveryCountry().name(), nz(o.getDeliveryAddress()), items, gift,
                    nz(o.getGiftMessage()), nz(o.getNote())).stream().map(OrderExport::cell).toList())).append("\r\n");
        }
        audit.record(actorEmail, "ORDERS_EXPORTED", "ORDER_EXPORT", new java.util.UUID(0L, 0L), null, Map.of("days", days, "orders", list.size()));
        return out.toString();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    /** One CSV cell: formula-like text defused, quoted when it holds a comma, quote or line break. */
    static String cell(String raw) {
        String v = raw == null ? "" : raw;
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        if (v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r")) v = "\"" + v.replace("\"", "\"\"") + "\"";
        return v;
    }
}
