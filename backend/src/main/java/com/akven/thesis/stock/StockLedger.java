package com.akven.thesis.stock;

import com.akven.thesis.catalog.Variant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Writes the ledger row for a stock change that has just been made on the variant. It always runs inside the
 * caller's transaction (MANDATORY), so the change and its row are saved together or not at all.
 */
@Service
public class StockLedger {

    private final StockMovementRepository movements;

    public StockLedger(StockMovementRepository movements) {
        this.movements = movements;
    }

    /** Records {@code delta} pairs for {@code reason}; a change of zero is not a movement and writes nothing. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Variant variant, int delta, StockReason reason, UUID orderId, String actor, String note) {
        if (delta == 0) return;
        movements.save(new StockMovement(variant, delta, reason, orderId, actor, note));
    }
}
