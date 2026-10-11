package com.akven.thesis.shop;

import com.akven.thesis.settings.Settings;
import com.akven.thesis.support.IntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Real contacts come from the environment, never from the repository: applied once, again only when they change. */
class ContactImportTest extends IntegrationTest {

    private static final String SPEC = "WHATSAPP|Akylbek|+996 700 123 456; whatsapp|Venera|+996700123457;"
            + "FACEBOOK|Facebook|https://www.facebook.com/share/1AbCdEfGh/?mibextid=abc";

    @Autowired private ShopContactRepository contacts;
    @Autowired private Settings settings;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clear() {
        jdbc.update("delete from shop_contact");
        jdbc.update("delete from app_setting");
    }

    @Test
    void entriesAreCheckedTidiedAndKeptInOrder() {
        List<ShopContact> parsed = ContactImport.parse(SPEC + ";PHONE|Bad|0700;PIGEON|x|y;no pipes here");
        assertThat(parsed).extracting(ShopContact::getValue).containsExactly("+996700123456", "+996700123457", "share/1AbCdEfGh");
        assertThat(parsed).extracting(ShopContact::getPosition).containsExactly(0, 1, 2);
        assertThat(ContactKind.FACEBOOK.link(parsed.get(2).getValue())).isEqualTo("https://facebook.com/share/1AbCdEfGh");
    }

    @Test
    void theListReplacesTheContactsOnceAndAgainOnlyWhenItChanges() {
        contacts.save(new ShopContact(ContactKind.INSTAGRAM, null, "akven.socks", 0, true));
        assertThat(new ContactImport(contacts, settings, SPEC).apply()).isEqualTo(3);
        assertThat(contacts.findAllByOrderByPositionAscKindAsc()).extracting(ShopContact::getLabel).containsExactly("Akylbek", "Venera", "Facebook");

        // The owners edit in the admin; a restart with the same list leaves their edits alone.
        contacts.save(new ShopContact(ContactKind.TELEGRAM, null, "akvenshop", 5, true));
        assertThat(new ContactImport(contacts, settings, SPEC).apply()).isEqualTo(-1);
        assertThat(contacts.count()).isEqualTo(4);

        assertThat(new ContactImport(contacts, settings, "EMAIL|Shop|shop@akven.kg").apply()).isEqualTo(1);
        assertThat(contacts.count()).isEqualTo(1);
        assertThat(new ContactImport(contacts, settings, "").apply()).isEqualTo(-1);
        assertThat(new ContactImport(contacts, settings, "PHONE|x|nonsense").apply()).isZero();
        assertThat(contacts.count()).as("an unusable list changes nothing").isEqualTo(1);
    }
}
