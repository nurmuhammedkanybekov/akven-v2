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
        assertThat(String.valueOf(main.getProperty("springdoc.api-docs.enabled"))).as("the API map is not public").isEqualTo("${API_DOCS:false}");
        assertThat(String.valueOf(main.getProperty("springdoc.swagger-ui.enabled"))).isEqualTo("${API_DOCS:false}");
    }

    @Test
    void theDemoProfileIsWhereTheSimulatedWalletAndTheDemoCatalogLive() throws Exception {
        PropertySource<?> demo = load("application-demo.yml");
        assertThat(demo.getProperty("akven.payments.provider")).isEqualTo("simulated");
        assertThat(String.valueOf(demo.getProperty("spring.flyway.locations"))).contains("classpath:db/seed");
        assertThat(demo.getProperty("springdoc.api-docs.enabled")).isEqualTo(true);
    }

    /**
     * A demo database restarted without demo mode (the CI smoke test does exactly this) has applied seed migrations
     * that the shop no longer sees. When the newest seed comes after the newest schema migration (V35_1 after V35),
     * Flyway calls it "future", not "missing", and refused to start until both were ignored.
     */
    @Test
    void aDemoDatabaseStartsWithoutDemoModeEvenWhenItsNewestMigrationIsASeed(@org.junit.jupiter.api.io.TempDir java.nio.file.Path dir) throws Exception {
        java.nio.file.Path schema = java.nio.file.Files.createDirectories(dir.resolve("migration"));
        java.nio.file.Path seed = java.nio.file.Files.createDirectories(dir.resolve("seed"));
        java.nio.file.Files.writeString(schema.resolve("V1__table.sql"), "create table sock (id int primary key);");
        java.nio.file.Files.writeString(seed.resolve("V1_1__seed.sql"), "insert into sock values (1);");
        String url = "jdbc:h2:mem:flyway-" + java.util.UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        org.flywaydb.core.Flyway.configure().dataSource(url, "sa", "")
                .locations("filesystem:" + schema, "filesystem:" + seed).load().migrate();

        String patterns = String.valueOf(load("application.yml").getProperty("spring.flyway.ignore-migration-patterns"));
        var withoutDemo = org.flywaydb.core.Flyway.configure().dataSource(url, "sa", "")
                .locations("filesystem:" + schema).ignoreMigrationPatterns(patterns.split(",")).load();
        assertThat(withoutDemo.validateWithResult().validationSuccessful).as("patterns " + patterns).isTrue();
        withoutDemo.migrate();
    }
}
