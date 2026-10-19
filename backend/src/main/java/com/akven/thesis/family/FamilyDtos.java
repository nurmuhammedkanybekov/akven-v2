package com.akven.thesis.family;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The family a customer keeps in their account. The whole list is sent and saved at once, in the order shown. */
public final class FamilyDtos {

    private FamilyDtos() {
    }

    /** A name is optional ("Dad" is enough); it is plain text, letters, digits, spaces and a little punctuation. */
    public record MemberInput(@Size(max = 40) @Pattern(regexp = "[\\p{L}\\p{M}\\p{N} .,'’()-]*", message = "letters, digits and spaces only") String name,
                              @NotNull @Pattern(regexp = "dad|mom|son|daughter|grandpa|grandma|baby", message = "unknown role") String role,
                              @NotNull @Min(14) @Max(50) Integer shoeSize,
                              @NotNull @Min(1) @Max(30) Integer pairs,
                              @Past LocalDate birthday) {}

    public record FamilyRequest(@NotNull @Size(max = FamilyService.MAX_MEMBERS) List<@Valid @NotNull MemberInput> members) {}

    public record MemberView(UUID id, String name, String role, int shoeSize, int pairs, LocalDate birthday) {

        static MemberView of(FamilyMember m) {
            return new MemberView(m.getId(), m.getName(), m.getRole(), m.getShoeSize(), m.getPairs(), m.getBirthday());
        }
    }
}
