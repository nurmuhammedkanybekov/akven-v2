-- Demo: example sizes, to be checked against the Korean labels on the packaging.
insert into size_chart_row (label, foot_cm_min, foot_cm_max, kr_mm_min, kr_mm_max, local_min, local_max, eu_min, eu_max, us_label, position) values
    ('Kids',  15.0, 21.0, 150, 210, 24, 33, 25, 34, '8C–2Y',     0),
    ('Women', 22.5, 26.0, 225, 260, 35, 41, 36, 41, 'W 5.5–9.5', 1),
    ('Men',   26.0, 29.0, 260, 290, 41, 45, 41, 46, 'M 8–12',    2);
