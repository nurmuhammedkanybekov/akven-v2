package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.order.OrderDtos.CartItem;
import com.akven.thesis.order.OrderDtos.CheckoutRequest;
import com.akven.thesis.order.OrderDtos.FulfillmentInput;
import com.akven.thesis.order.OrderDtos.PaymentInput;
import com.akven.thesis.payment.PaymentMethod;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The race the thesis plan called out: many customers reach for the last pair at the same instant. Every checkout is
 * a real transaction on its own thread. Exactly as many succeed as there are pairs, nobody is oversold, and two carts
 * that share several items in opposite orders do not deadlock.
 */
class OrderConcurrencyTest extends IntegrationTest {

    @Autowired private OrderService orderService;
    @Autowired private OrderTestData data;
    @Autowired private OrderRepository orders;

    private CheckoutRequest cart(int qty, String... skus) {
        List<CartItem> items = new ArrayList<>();
        for (String sku : skus) items.add(new CartItem(sku, qty, null));
        return new CheckoutRequest(items, new FulfillmentInput(FulfillmentMethod.PICKUP, "Racer", "+996 700 000 000", null, null),
                new PaymentInput(PaymentMethod.APPLE_PAY, "sim_apple_abcdef123456"));
    }

    /** Runs one checkout per customer, all released at the same moment. Returns how many succeeded / were refused for stock. */
    private int[] race(int customers, CheckoutRequest request) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(customers);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < customers; i++) {
            String email = "racer-" + UUID.randomUUID() + "@akven.test";
            data.customer(email);
            results.add(pool.submit((Callable<Boolean>) () -> {
                go.await();
                try {
                    orderService.checkout(email, UUID.randomUUID().toString(), request);
                    return true;
                } catch (ConflictException soldOut) {
                    return false;
                }
            }));
        }
        go.countDown();
        int ok = 0, refused = 0;
        for (Future<Boolean> f : results) { if (f.get()) ok++; else refused++; }
        pool.shutdown();
        return new int[]{ok, refused};
    }

    @Test
    void sixCustomersRaceForTheLastPairAndExactlyOneGetsIt() throws Exception {
        Variant v = data.variant(1);
        int[] r = race(6, cart(1, v.getSku()));
        assertThat(r[0]).as("successful checkouts").isEqualTo(1);
        assertThat(r[1]).as("refused for stock").isEqualTo(5);
        Variant after = data.reload(v);
        assertThat(after.getStockQty()).isZero();
        assertThat(after.getReservedQty()).isZero();
        assertThat(after.available()).isZero();
    }

    @Test
    void eightCustomersRaceForThreePairsAndExactlyThreeSucceed() throws Exception {
        Variant v = data.variant(3);
        int[] r = race(8, cart(1, v.getSku()));
        assertThat(r[0]).isEqualTo(3);
        assertThat(r[1]).isEqualTo(5);
        Variant after = data.reload(v);
        assertThat(after.getStockQty()).isZero();
        assertThat(after.getReservedQty()).isZero();
    }

    @Test
    void cartsSharingItemsInOppositeOrdersDoNotDeadlock() throws Exception {
        Variant a = data.variant(50), b = data.variant(50);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < 16; i++) {
            String email = "swap-" + UUID.randomUUID() + "@akven.test";
            data.customer(email);
            CheckoutRequest request = i % 2 == 0 ? cart(1, a.getSku(), b.getSku()) : cart(1, b.getSku(), a.getSku());   // opposite orders
            results.add(pool.submit(() -> { go.await(); orderService.checkout(email, UUID.randomUUID().toString(), request); return true; }));
        }
        go.countDown();
        for (Future<Boolean> f : results) assertThat(f.get()).isTrue();          // none failed, none hung
        pool.shutdown();
        assertThat(data.reload(a).getStockQty()).isEqualTo(34);
        assertThat(data.reload(b).getStockQty()).isEqualTo(34);
        assertThat(data.reload(a).getReservedQty()).isZero();
    }
}
