package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Category;
import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.Variant;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ProductKnowledgeTest {

    private final ProductKnowledge knowledge = new ProductKnowledge();
    private final Product product = new Product("wool", "Wool Crew", Category.MEN, null, null, "Line", "Warm and soft for winter", "80% merino wool, 20% nylon");
    private final Variant variant = new Variant(product, "W-1", "M", "Navy", 3, new BigDecimal("10"), new BigDecimal("4"), new BigDecimal("15"));

    @Test
    void theMostRelevantFactComesFirst() {
        product.setDetails(null, "Machine wash cold, do not tumble dry.", null);
        var facts = knowledge.retrieve(product, variant, "can I tumble dry them or wash hot?", 3);
        assertThat(facts.get(0)).startsWith("Care:");
        assertThat(facts).hasSize(3);
    }

    @Test
    void emptyFieldsAreSkippedAndTheLimitIsRespected() {
        assertThat(knowledge.retrieve(product, variant, "hello", 2)).hasSize(2);
        assertThat(knowledge.retrieve(product, variant, "hello", 0)).isEmpty();
        assertThat(knowledge.retrieve(product, variant, "hello", 10)).noneMatch(f -> f.startsWith("Care:") || f.startsWith("Made in:"));
    }

    @Test
    void packSizeIsAFactAndNoPricesOrCostsAreEverIncluded() {
        var all = knowledge.retrieve(product, variant, "pack", 10);
        assertThat(all).anyMatch(f -> f.contains("3 pairs"));
        assertThat(String.join(" ", all).toLowerCase()).doesNotContain("cost").doesNotContain("margin").doesNotContain("floor");
    }
}
