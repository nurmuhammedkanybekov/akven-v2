-- The demo areas, the way the family delivers: a courier in Bishkek and the Chui region (the family's own car for
-- large orders), and cargo carriers to the regions and abroad, paid by the customer on receipt. Example names and
-- prices: the owners enter the carriers they really work with.
update delivery_zone set kind = 'COURIER', note = 'We send a courier (Yandex taxi) the same or the next day. From $40 our own car brings it, free.'
    where name = 'Bishkek';
update delivery_zone set kind = 'COURIER', note = 'A courier or our own car, by arrangement on the phone.'
    where name = 'Chui region';
update delivery_zone set kind = 'CARGO', pay_on_receipt = true, fee = 0, free_from = null, name = 'Bus cargo: Osh, Jalal-Abad, the south',
    note = 'We hand the parcel to the bus cargo at Dordoi. You pay the carrier when you collect it; we send you the waybill.'
    where name = 'Osh, Jalal-Abad and the south';
update delivery_zone set kind = 'CARGO', pay_on_receipt = true, fee = 0, free_from = null, name = 'Bus cargo: Issyk-Kul, Naryn, Talas',
    note = 'We hand the parcel to the bus cargo at Dordoi. You pay the carrier when you collect it; we send you the waybill.'
    where name = 'Issyk-Kul, Naryn and Talas';
update delivery_zone set kind = 'CARGO', pay_on_receipt = true, fee = 0, free_from = null,
    note = 'We take the parcel to the cargo carrier you name. You pay the carrier on receipt; customs papers are on us.'
    where country in ('KZ', 'UZ', 'RU');
