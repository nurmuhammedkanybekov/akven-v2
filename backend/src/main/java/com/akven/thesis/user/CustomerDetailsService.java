package com.akven.thesis.user;

import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.delivery.DeliveryZoneRepository;
import com.akven.thesis.order.Country;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The details a customer keeps for the next order. Each account reads and changes only its own (the email comes from
 * the token, never from the request). Text is kept as one line of plain text; a delivery area must exist and match the
 * country; an area removed later is simply forgotten.
 */
@Service
public class CustomerDetailsService {

    public record DetailsInput(@Size(max = 120) String contactName,
                               @Pattern(regexp = "[0-9+()\\-\\s]{6,40}", message = "enter a phone number") String contactPhone,
                               @Size(max = 300) String address,
                               Country country,
                               UUID zoneId) {}

    public record DetailsView(String contactName, String contactPhone, String address, Country country, UUID zoneId) {
        static final DetailsView EMPTY = new DetailsView(null, null, null, null, null);
    }

    private final CustomerDetailsRepository details;
    private final UserRepository users;
    private final DeliveryZoneRepository zones;

    public CustomerDetailsService(CustomerDetailsRepository details, UserRepository users, DeliveryZoneRepository zones) {
        this.details = details;
        this.users = users;
        this.zones = zones;
    }

    @Transactional(readOnly = true)
    public DetailsView mine(String email) {
        return details.findById(user(email)).map(d -> new DetailsView(d.getContactName(), d.getContactPhone(), d.getAddress(), d.getCountry(),
                d.getZoneId() != null && zones.findById(d.getZoneId()).map(z -> z.isActive()).orElse(false) ? d.getZoneId() : null))
                .orElse(DetailsView.EMPTY);
    }

    @Transactional
    public DetailsView save(String email, DetailsInput in) {
        UUID id = user(email);
        Country country = in.country();
        if (in.zoneId() != null) {
            var zone = zones.findById(in.zoneId()).orElseThrow(() -> new BusinessRuleException("That delivery area no longer exists."));
            if (country != null && zone.getCountry() != country) throw new BusinessRuleException("The delivery area is not in the chosen country.");
            country = zone.getCountry();
        }
        CustomerDetails d = details.findById(id).orElseGet(() -> new CustomerDetails(id));
        d.update(line(in.contactName()), line(in.contactPhone()), line(in.address()), country, in.zoneId());
        details.save(d);
        return new DetailsView(d.getContactName(), d.getContactPhone(), d.getAddress(), d.getCountry(), d.getZoneId());
    }

    @Transactional
    public void forget(String email) {
        details.deleteById(user(email));
    }

    private UUID user(String email) {
        return users.findByEmail(email).orElseThrow(() -> new NotFoundException("Account not found.")).getId();
    }

    /** One line of plain text, or null when empty. */
    static String line(String s) {
        if (s == null) return null;
        String v = s.replaceAll("\\p{Cc}", " ").replaceAll("\\s+", " ").strip();
        return v.isEmpty() ? null : v;
    }
}
