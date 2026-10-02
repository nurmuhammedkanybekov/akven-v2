package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.Variant;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The retrieval step of the assistant (the R in RAG): turns what the shop knows about a product into short facts
 * and picks the ones most relevant to the customer's question, so the model answers from the catalog instead of
 * guessing. Only customer-safe fields are used here, never cost price or margin floor.
 */
@Component
public class ProductKnowledge {

    private static final Pattern WORDS = Pattern.compile("[\\p{L}\\p{N}]{3,}");
    private static final Set<String> STOP = Set.of("the", "and", "for", "you", "can", "are", "this", "that", "with", "what", "how", "get", "have", "your", "any");

    public List<String> retrieve(Product product, Variant variant, String question, int limit) {
        List<String> facts = new ArrayList<>();
        add(facts, "Description", product.getDescription());
        add(facts, "Fabric", product.getFabricComposition());
        add(facts, "Quality", product.getQuality());
        add(facts, "Care", product.getCare());
        add(facts, "Made in", product.getOrigin());
        if (variant.getPackSize() != null && variant.getPackSize() > 1) facts.add("Pack: " + variant.getPackSize() + " pairs in one pack.");
        if (variant.getSize() != null) facts.add("Size: " + variant.getSize() + ".");
        if (variant.getColor() != null) facts.add("Colour: " + variant.getColor() + ".");

        Set<String> wanted = words(question);
        return facts.stream()
                .sorted(Comparator.comparingInt((String f) -> -overlap(f, wanted)))   // stable: ties keep the catalog order
                .limit(Math.max(0, limit))
                .toList();
    }

    private static void add(List<String> facts, String label, String value) {
        if (value != null && !value.isBlank()) facts.add(label + ": " + value.strip());
    }

    private static int overlap(String fact, Set<String> wanted) {
        int n = 0;
        for (String w : words(fact)) if (wanted.contains(w)) n++;
        return n;
    }

    private static Set<String> words(String text) {
        Set<String> out = new java.util.HashSet<>();
        if (text == null) return out;
        var m = WORDS.matcher(text.toLowerCase(Locale.ROOT));
        while (m.find()) if (!STOP.contains(m.group())) out.add(m.group());
        return out;
    }
}
