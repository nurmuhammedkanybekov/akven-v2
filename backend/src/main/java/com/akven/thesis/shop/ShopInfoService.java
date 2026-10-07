package com.akven.thesis.shop;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.shop.ShopDtos.ContactRequest;
import com.akven.thesis.shop.ShopDtos.ContactView;
import com.akven.thesis.shop.ShopDtos.PickupPointRequest;
import com.akven.thesis.shop.ShopDtos.PickupPointView;
import com.akven.thesis.shop.ShopDtos.ShopInfo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Contacts and pickup points. Everyone may read the active ones; only owners (ADMIN) change them, and every change
 * is audited. Contact values are checked against their kind, and the links are built here, never taken from input.
 */
@Service
public class ShopInfoService {

    private final ShopContactRepository contacts;
    private final PickupPointRepository points;
    private final AuditService audit;

    public ShopInfoService(ShopContactRepository contacts, PickupPointRepository points, AuditService audit) {
        this.contacts = contacts;
        this.points = points;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ShopInfo publicInfo() {
        return new ShopInfo(contacts.findByActiveTrueOrderByPositionAscKindAsc().stream().map(ContactView::of).toList(),
                points.findByActiveTrueOrderByPositionAscNameAsc().stream().map(PickupPointView::of).toList());
    }

    /** The point new pickup orders are assigned to: the first active one, if the owners have entered any. */
    @Transactional(readOnly = true)
    public Optional<PickupPoint> defaultPickupPoint() {
        return points.findByActiveTrueOrderByPositionAscNameAsc().stream().findFirst();
    }

    // ---- contacts ---------------------------------------------------------------------------

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<ContactView> allContacts() {
        return contacts.findAllByOrderByPositionAscKindAsc().stream().map(ContactView::of).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ContactView createContact(String actorEmail, ContactRequest r) {
        String value = checkedValue(r);
        ShopContact c = contacts.saveAndFlush(new ShopContact(r.kind(), blankToNull(r.label()), value, orZero(r.position()), r.active() == null || r.active()));
        ContactView view = ContactView.of(c);
        audit.record(actorEmail, "CONTACT_CREATED", "SHOP_CONTACT", c.getId(), null, view);
        return view;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ContactView updateContact(String actorEmail, UUID id, ContactRequest r) {
        ShopContact c = contacts.findById(id).orElseThrow(() -> new NotFoundException("Contact not found."));
        String value = checkedValue(r);
        ContactView before = ContactView.of(c);
        c.update(r.kind(), blankToNull(r.label()), value, orZero(r.position()), r.active() == null || r.active());
        ContactView after = ContactView.of(contacts.saveAndFlush(c));
        audit.record(actorEmail, "CONTACT_UPDATED", "SHOP_CONTACT", id, before, after);
        return after;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteContact(String actorEmail, UUID id) {
        ShopContact c = contacts.findById(id).orElseThrow(() -> new NotFoundException("Contact not found."));
        ContactView before = ContactView.of(c);
        contacts.delete(c);
        audit.record(actorEmail, "CONTACT_DELETED", "SHOP_CONTACT", id, before, null);
    }

    private static String checkedValue(ContactRequest r) {
        String value = r.kind().normalise(r.value());
        if (!r.kind().isValid(value)) {
            throw new BusinessRuleException("Enter " + r.kind().hint() + ".");
        }
        return value;
    }

    // ---- pickup points ----------------------------------------------------------------------

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<PickupPointView> allPickupPoints() {
        return points.findAllByOrderByPositionAscNameAsc().stream().map(PickupPointView::of).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PickupPointView createPickupPoint(String actorEmail, PickupPointRequest r) {
        PickupPoint p = points.saveAndFlush(new PickupPoint(r.name().trim(), r.market().trim(), blankToNull(r.section()), blankToNull(r.passage()),
                r.container().trim(), blankToNull(r.city()), blankToNull(r.hours()), blankToNull(r.directions()), orZero(r.position()),
                r.active() == null || r.active()));
        PickupPointView view = PickupPointView.of(p);
        audit.record(actorEmail, "PICKUP_POINT_CREATED", "PICKUP_POINT", p.getId(), null, view);
        return view;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PickupPointView updatePickupPoint(String actorEmail, UUID id, PickupPointRequest r) {
        PickupPoint p = points.findById(id).orElseThrow(() -> new NotFoundException("Pickup point not found."));
        PickupPointView before = PickupPointView.of(p);
        p.update(r.name().trim(), r.market().trim(), blankToNull(r.section()), blankToNull(r.passage()), r.container().trim(),
                blankToNull(r.city()), blankToNull(r.hours()), blankToNull(r.directions()), orZero(r.position()), r.active() == null || r.active());
        PickupPointView after = PickupPointView.of(points.saveAndFlush(p));
        audit.record(actorEmail, "PICKUP_POINT_UPDATED", "PICKUP_POINT", id, before, after);
        return after;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static int orZero(Integer i) {
        return i == null ? 0 : i;
    }
}
