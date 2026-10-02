package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Category;
import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.Variant;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** The safety gate on its own: whatever is proposed, the result is between 0 and the margin floor. */
class PolicyValidatorTest {

    private final PolicyValidator validator = new PolicyValidator();
    private final Variant variant = new Variant(new Product("p", "P", Category.MEN, null, null, "c", "d", "cotton"),
            "SKU-1", "M", "Navy", 1, new BigDecimal("10.00"), new BigDecimal("4.00"), new BigDecimal("15.00"));

    private BigDecimal clamp(String proposed) {
        return validator.clamp(proposed == null ? null : new BigDecimal(proposed), variant);
    }

    @Test
    void belowTheFloorPassesThrough() {
        assertThat(clamp("8")).isEqualByComparingTo("8");
    }

    @Test
    void exactlyTheFloorPassesThrough() {
        assertThat(clamp("15.00")).isEqualByComparingTo("15");
    }

    @Test
    void aboveTheFloorIsCappedAtTheFloor() {
        assertThat(clamp("15.01")).isEqualByComparingTo("15");
        assertThat(clamp("100")).isEqualByComparingTo("15");
        assertThat(clamp("99999")).isEqualByComparingTo("15");
    }

    @Test
    void negativeOrMissingProposalsGiveNoDiscount() {
        assertThat(clamp("-5")).isEqualByComparingTo("0");
        assertThat(clamp(null)).isEqualByComparingTo("0");
    }

    @Test
    void zeroStaysZero() {
        assertThat(clamp("0")).isEqualByComparingTo("0");
    }
}
