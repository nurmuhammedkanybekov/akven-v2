package com.akven.thesis.support;

import jakarta.persistence.EntityManager;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The H2 test schema is made by Hibernate, not by Flyway, so the four free delivery areas that V33 inserts are added
 * here instead: one per country, exactly as the migration does.
 */
@Component
class DefaultDeliveryZones implements ApplicationRunner {

    private final EntityManager em;
    private final TransactionTemplate tx;

    DefaultDeliveryZones(EntityManager em, TransactionTemplate tx) {
        this.em = em;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        tx.executeWithoutResult(s -> {
            Number n = (Number) em.createNativeQuery("select count(*) from delivery_zone").getSingleResult();
            if (n.longValue() > 0) return;
            String[][] zones = {{"KG", "Kyrgyzstan", "10"}, {"KZ", "Kazakhstan", "20"}, {"UZ", "Uzbekistan", "30"}, {"RU", "Russia", "40"}};
            for (String[] z : zones) {
                em.createNativeQuery("insert into delivery_zone (id, country, name, fee, active, position) values (random_uuid(), ?1, ?2, 0, true, ?3)")
                        .setParameter(1, z[0]).setParameter(2, z[1]).setParameter(3, Integer.parseInt(z[2])).executeUpdate();
            }
        });
    }
}
