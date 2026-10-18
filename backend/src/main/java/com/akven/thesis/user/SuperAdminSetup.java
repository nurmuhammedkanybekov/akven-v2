package com.akven.thesis.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Creates the super admin account on a real installation, where there is no demo data: SUPER_ADMIN_EMAIL and
 * SUPER_ADMIN_PASSWORD in the environment (an ignored .env file). It only ever creates the account; an existing account
 * is left alone, so changing the password later happens in the admin, not here. Owners and staff are then created by
 * the super admin in the admin.
 *
 * <p>Once the installation has its own super admin, the demo team accounts (every {@code @akven.test} address, whose
 * passwords are printed in the README) are switched off at each start, so a real shop never keeps a door with a public
 * key. DEMO_ACCOUNTS=on keeps them, for presenting the project.
 */
@Component
public class SuperAdminSetup implements ApplicationRunner {

    static final int MIN_PASSWORD = 12;
    static final String DEMO_DOMAIN = "@akven.test";
    private static final Logger log = LoggerFactory.getLogger(SuperAdminSetup.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;
    private final String name;
    private final boolean keepDemoAccounts;

    public SuperAdminSetup(UserRepository users, PasswordEncoder encoder,
                           @Value("${akven.super-admin.email:}") String email,
                           @Value("${akven.super-admin.password:}") String password,
                           @Value("${akven.super-admin.name:}") String name,
                           @Value("${akven.demo-accounts:off}") String demoAccounts) {
        this.users = users;
        this.encoder = encoder;
        this.email = email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
        this.password = password == null ? "" : password;
        this.name = name == null || name.isBlank() ? null : name.strip();
        this.keepDemoAccounts = "on".equalsIgnoreCase(demoAccounts == null ? "" : demoAccounts.strip());
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isEmpty() || password.isEmpty()) return;
        if (users.findByEmail(email).isEmpty()) {
            if (password.length() < MIN_PASSWORD || !email.contains("@")) {
                log.warn("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD were not used: the password needs at least {} characters.", MIN_PASSWORD);
                return;
            }
            User user = new User(email, encoder.encode(password), Role.SUPER_ADMIN);
            user.setDisplayName(name);
            users.save(user);
            log.info("Super admin account created from the environment.");
        }
        if (!keepDemoAccounts) switchOffDemoAccounts();
    }

    private void switchOffDemoAccounts() {
        List<User> demo = users.findByEmailEndingWithAndActiveTrue(DEMO_DOMAIN);
        demo.forEach(user -> user.setActive(false));
        if (!demo.isEmpty()) log.info("{} demo account(s) switched off; set DEMO_ACCOUNTS=on to keep them.", demo.size());
    }
}
