package com.akven.thesis.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The shipped configuration files themselves (the tests otherwise run on their own application.yml): they must parse,
 * a start without a profile must be safe, and only the demo profile may switch on the simulated wallet.
 */
class SafeDefaultsTest {

    private static PropertySource<?> load(String file) throws Exception {
        List<PropertySource<?>> sources = new YamlPropertySourceLoader().load(file, new FileSystemResource("src/main/resources/" + file));
        assertThat(sources).as(file + " parses").hasSize(1);
        return sources.get(0);
    }

    @Test
    void withoutAProfileTheShopTakesNoPaymentsAndLoadsNoDemoData() throws Exception {
        PropertySource<?> main = load("application.yml");
        assertThat(main.getProperty("spring.profiles.active")).as("no profile is switched on by default").isNull();
        assertThat(String.valueOf(main.getProperty("akven.payments.provider"))).isEqualTo("${PAYMENT_PROVIDER:none}");
        assertThat(String.valueOf(main.getProperty("akven.demo-accounts"))).isEqualTo("${DEMO_ACCOUNTS:off}");
        assertThat(String.valueOf(main.getProperty("spring.flyway.locations"))).doesNotContain("seed");
    }

    @Test
    void theDemoProfileIsWhereTheSimulatedWalletAndTheDemoCatalogLive() throws Exception {
        PropertySource<?> demo = load("application-demo.yml");
        assertThat(demo.getProperty("akven.payments.provider")).isEqualTo("simulated");
        assertThat(String.valueOf(demo.getProperty("spring.flyway.locations"))).contains("classpath:db/seed");
    }
}
