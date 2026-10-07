package com.akven.thesis.sizes;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Shapes of the size chart API. */
public final class SizeDtos {

    private SizeDtos() {
    }

    public record RowRequest(@NotBlank @Size(max = 40) String label,
                             @NotNull @DecimalMin("5") @DecimalMax("40") BigDecimal footCmMin,
                             @NotNull @DecimalMin("5") @DecimalMax("40") BigDecimal footCmMax,
                             @NotNull @Min(50) @Max(400) Integer krMmMin,
                             @NotNull @Min(50) @Max(400) Integer krMmMax,
                             @NotNull @DecimalMin("10") @DecimalMax("60") BigDecimal localMin,
                             @NotNull @DecimalMin("10") @DecimalMax("60") BigDecimal localMax,
                             @NotNull @DecimalMin("10") @DecimalMax("60") BigDecimal euMin,
                             @NotNull @DecimalMin("10") @DecimalMax("60") BigDecimal euMax,
                             @NotBlank @Size(max = 40) String usLabel,
                             @Min(0) @Max(1000) Integer position) {}

    public record Range(BigDecimal min, BigDecimal max) {}

    public record RowView(UUID id, String label, Range footCm, Range krMm, Range local, Range eu, String us) {

        static RowView of(SizeChartRow r) {
            return new RowView(r.getId(), r.getLabel(), new Range(r.getFootCmMin(), r.getFootCmMax()),
                    new Range(BigDecimal.valueOf(r.getKrMmMin()), BigDecimal.valueOf(r.getKrMmMax())),
                    new Range(r.getLocalMin(), r.getLocalMax()), new Range(r.getEuMin(), r.getEuMax()), r.getUsLabel());
        }
    }

    /** columns: which columns this language shows first, in order; every column is still in each row. */
    public record Chart(String lang, List<String> columns, List<RowView> rows) {}

    /** Every sock size that fits; two at a boundary (a 41 can be the top of one size and the bottom of the next). */
    public record Match(SizeSystem system, BigDecimal size, List<String> labels) {}
}
