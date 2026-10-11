-- Demo: the stall is open every day from 8:00 to 16:00.
update pickup_point set opens_at = '08:00', closes_at = '16:00', open_days = 127, hours = null;
