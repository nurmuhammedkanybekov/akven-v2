-- A case built from the real shelves is one line per colour and size, with its code: a few dozen lines need more room
-- than the old 1000 characters.
alter table wholesale_request alter column mix type varchar(4000);
