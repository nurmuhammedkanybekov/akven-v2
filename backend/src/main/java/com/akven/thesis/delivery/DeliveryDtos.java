package com.akven.thesis.delivery;

import com.akven.thesis.order.Country;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public final class DeliveryDtos {

    private DeliveryDtos() {
    }

    public record ZoneView(UUID id, Country country, String name, BigDecimal fee, BigDecimal freeFrom, Integer daysMin,
                           Integer daysMax, boolean active, int position, DeliveryKind kind, boolean payOnReceipt, String note) {
        static ZoneView of(DeliveryZone z) {
            return new ZoneView(z.getId(), z.getCountry(), z.getName(), z.getFee(), z.getFreeFrom(), z.getDaysMin(), z.getDaysMax(),
                    z.isActive(), z.getPosition(), z.getKind(), z.isPayOnReceipt(), z.getNote());
        }
    }

    public record ZoneInput(@NotNull Country country,
                            @NotBlank @Size(min = 2, max = 60) String name,
                            @NotNull @DecimalMin("0.00") @DecimalMax("1000.00") @Digits(integer = 10, fraction = 2) BigDecimal fee,
                            @DecimalMin("0.01") @DecimalMax("100000.00") @Digits(integer = 10, fraction = 2) BigDecimal freeFrom,
                            @Min(0) @Max(60) Integer daysMin,
                            @Min(0) @Max(60) Integer daysMax,
                            boolean active,
                            @Min(0) @Max(10000) int position,
                            DeliveryKind kind,
                            boolean payOnReceipt,
                            @Size(max = 300) String note) {}
}
