package com.akven.thesis.shop;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Shapes of the shop information API: contacts and pickup points. */
public final class ShopDtos {

    private ShopDtos() {
    }

    public record ContactRequest(@NotNull ContactKind kind, @Size(max = 80) String label, @NotBlank @Size(max = 120) String value,
                                 @Min(0) @Max(1000) Integer position, Boolean active) {}

    /** url is built by the server from the kind and the value, so a contact can never link somewhere else. */
    public record ContactView(UUID id, ContactKind kind, String label, String value, String url, int position, boolean active) {

        static ContactView of(ShopContact c) {
            return new ContactView(c.getId(), c.getKind(), c.getLabel(), c.getValue(), c.getKind().link(c.getValue()),
                    c.getPosition(), c.isActive());
        }
    }

    public record PickupPointRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Size(max = 120) String market,
                                     @Size(max = 120) String section, @Size(max = 40) String passage,
                                     @NotBlank @Size(max = 40) String container, @Size(max = 80) String city,
                                     @Size(max = 200) String hours, @Size(max = 1000) String directions,
                                     @Min(0) @Max(1000) Integer position, Boolean active) {}

    public record PickupPointView(UUID id, String name, String market, String section, String passage, String container,
                                  String city, String hours, String directions, int position, boolean active) {

        public static PickupPointView of(PickupPoint p) {
            return new PickupPointView(p.getId(), p.getName(), p.getMarket(), p.getSection(), p.getPassage(), p.getContainer(),
                    p.getCity(), p.getHours(), p.getDirections(), p.getPosition(), p.isActive());
        }
    }

    public record ShopInfo(List<ContactView> contacts, List<PickupPointView> pickupPoints) {}
}
