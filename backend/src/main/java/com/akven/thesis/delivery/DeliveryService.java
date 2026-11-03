package com.akven.thesis.delivery;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.delivery.DeliveryDtos.ZoneInput;
import com.akven.thesis.delivery.DeliveryDtos.ZoneView;
import com.akven.thesis.order.Country;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Delivery zones: read by anyone (the checkout shows them), changed only by the owners, every change audited. Checkout
 * asks {@link #zoneFor} which zone an order travels in; it never trusts a fee sent by the browser.
 */
@Service
public class DeliveryService {

    private final DeliveryZoneRepository zones;
    private final AuditService audit;

    public DeliveryService(DeliveryZoneRepository zones, AuditService audit) {
        this.zones = zones;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<ZoneView> publicZones() {
        return zones.findByActiveTrueOrderByCountryAscPositionAscNameAsc().stream().map(ZoneView::of).toList();
    }

    /**
     * The zone an order is delivered in. With a zone id it must be an active zone (of the given country, when one is
     * given); without one, the first active zone of the country. No active zone means the shop does not deliver there.
     */
    @Transactional(readOnly = true)
    public DeliveryZone zoneFor(UUID zoneId, Country country) {
        if (zoneId != null) {
            DeliveryZone z = zones.findById(zoneId).filter(DeliveryZone::isActive)
                    .orElseThrow(() -> new BusinessRuleException("DELIVERY_AREA_GONE", Map.of(), "This delivery area is no longer available. Please choose another one."));
            if (country != null && z.getCountry() != country) {
                throw new BusinessRuleException("DELIVERY_AREA_COUNTRY", Map.of(), "The delivery area is not in the chosen country.");
            }
            return z;
        }
        Country c = country == null ? Country.KG : country;
        return zones.findByCountryAndActiveTrueOrderByPositionAscNameAsc(c).stream().findFirst()
                .orElseThrow(() -> new BusinessRuleException("DELIVERY_COUNTRY_CLOSED", Map.of(), "We do not deliver to this country at the moment. Please choose pickup at the stall."));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<ZoneView> allZones() {
        return zones.findAllByOrderByCountryAscPositionAscNameAsc().stream().map(ZoneView::of).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ZoneView create(String actorEmail, ZoneInput in) {
        DeliveryZone z = new DeliveryZone(in.country());
        apply(z, in);
        zones.saveAndFlush(z);
        audit.record(actorEmail, "DELIVERY_ZONE_CREATED", "DELIVERY_ZONE", z.getId(), null, snapshot(z));
        return ZoneView.of(z);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ZoneView update(String actorEmail, UUID id, ZoneInput in) {
        DeliveryZone z = zones.findById(id).orElseThrow(() -> new NotFoundException("No such delivery area."));
        Map<String, Object> before = snapshot(z);
        apply(z, in);
        audit.record(actorEmail, "DELIVERY_ZONE_UPDATED", "DELIVERY_ZONE", id, before, snapshot(z));
        return ZoneView.of(z);
    }

    /** Old orders keep their copy of the zone, so removing one never changes a receipt. */
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public void delete(String actorEmail, UUID id) {
        DeliveryZone z = zones.findById(id).orElseThrow(() -> new NotFoundException("No such delivery area."));
        audit.record(actorEmail, "DELIVERY_ZONE_DELETED", "DELIVERY_ZONE", id, snapshot(z), null);
        zones.delete(z);
    }

    private static void apply(DeliveryZone z, ZoneInput in) {
        Integer min = in.daysMin(), max = in.daysMax();
        if (max != null && min == null) throw new BusinessRuleException("Enter the shortest time as well as the longest.");
        if (min != null && max != null && max < min) throw new BusinessRuleException("The longest time cannot be shorter than the shortest.");
        if (in.freeFrom() != null && in.fee().signum() == 0) throw new BusinessRuleException("A free area needs no free-from amount.");
        z.update(in.country(), in.name().strip().replaceAll("\\s+", " "), in.fee(), in.freeFrom(), min, max == null ? min : max,
                in.active(), in.position());
    }

    private static Map<String, Object> snapshot(DeliveryZone z) {
        Map<String, Object> m = new HashMap<>();
        m.put("country", z.getCountry());
        m.put("name", z.getName());
        m.put("fee", z.getFee());
        m.put("freeFrom", z.getFreeFrom());
        m.put("days", z.getDaysMin() == null ? null : z.getDaysMin() + "-" + z.getDaysMax());
        m.put("active", z.isActive());
        return m;
    }
}
