package com.akven.thesis.payment;

import java.math.BigDecimal;

public record PaymentRequest(PaymentMethod method, String token, BigDecimal amount, String orderReference) {}
