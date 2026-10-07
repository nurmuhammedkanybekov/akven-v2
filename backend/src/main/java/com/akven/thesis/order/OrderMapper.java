package com.akven.thesis.order;

import com.akven.thesis.order.OrderDtos.FulfillmentView;
import com.akven.thesis.order.OrderDtos.OrderItemView;
import com.akven.thesis.order.OrderDtos.OrderView;
import com.akven.thesis.order.OrderDtos.PaymentView;

final class OrderMapper {

    private OrderMapper() {
    }

    /** withCustomer is for the admin, who needs to know whose order it is. Customers never see this field filled. */
    static OrderView toView(Order o, boolean withCustomer) {
        return new OrderView(o.getId(), o.getReference(), o.getStatus(), o.getTotal(), o.getCreatedAt(), o.getPaidAt(),
                o.getFulfilledAt(), o.getCancelledAt(),
                new FulfillmentView(o.getFulfillmentMethod(), o.getContactName(), o.getContactPhone(), o.getDeliveryAddress(), o.getNote()),
                o.getPaymentRef() == null ? null : new PaymentView(o.getPaymentMethod(), shorten(o.getPaymentRef())),
                o.getItems().stream().map(i -> new OrderItemView(i.getSku(), i.getProductName(), i.getProductSlug(), i.getVariantLabel(),
                        i.getColorHex(), i.getImageUrl(), i.getQuantity(), i.getListPrice(), i.getDiscountPct(), i.getUnitPrice(), i.lineTotal(),
                        i.getDiscountSource())).toList(),
                withCustomer ? o.getCustomer().getEmail() : null);
    }

    private static String shorten(String reference) {
        return reference.length() <= 10 ? reference : "…" + reference.substring(reference.length() - 8);
    }
}
