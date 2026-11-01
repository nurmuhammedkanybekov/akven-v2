package com.akven.thesis.wholesale;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class WholesaleDtos {

    private WholesaleDtos() {
    }

    /**
     * What the wholesale page sends. {@code website} is a trap field that people never see and never fill in; a bot
     * filling every field gets an ordinary answer and nothing is kept.
     */
    public record RequestInput(@NotNull WholesaleKind kind,
                               @NotBlank @Size(min = 2, max = 80) String company,
                               @Size(max = 60) String city,
                               @NotNull ContactKind contactKind,
                               @NotBlank @Size(max = 80) String contact,
                               @NotNull @Min(1) @Max(100000) Integer pairs,
                               @Size(max = 1000) String mix,
                               @Size(max = 500) String note,
                               @Size(max = 200) String website) {}

    /** The answer to the customer: a short reference they can quote when they call. */
    public record Received(String reference, Instant createdAt) {}

    public record InboxLine(UUID id, String reference, WholesaleKind kind, String company, String city, ContactKind contactKind,
                            String contact, int pairs, String mix, String note, String accountEmail, WholesaleStatus status,
                            String staffNote, Instant createdAt, Instant updatedAt) {
        static InboxLine of(WholesaleRequest r) {
            return new InboxLine(r.getId(), WholesaleService.reference(r.getId()), r.getKind(), r.getCompany(), r.getCity(),
                    r.getContactKind(), r.getContact(), r.getPairs(), r.getMix(), r.getNote(), r.getAccountEmail(), r.getStatus(),
                    r.getStaffNote(), r.getCreatedAt(), r.getUpdatedAt());
        }
    }

    public record Inbox(long waiting, java.util.List<InboxLine> requests) {}

    public record HandleInput(@NotNull WholesaleStatus status, @Size(max = 500) String staffNote) {}
}
