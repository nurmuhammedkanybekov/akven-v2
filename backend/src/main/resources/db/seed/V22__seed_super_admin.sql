-- Demo: the super admin (the person who runs the system) next to the owner and staff demo accounts.
insert into app_user (email, password_hash, role, display_name) values
    ('superadmin@akven.test', crypt('changeme-super', gen_salt('bf')), 'SUPER_ADMIN', 'Nur');
update app_user set display_name = 'Owner (demo)' where email = 'admin@akven.test';
update app_user set display_name = 'Staff (demo)' where email = 'staff@akven.test';
