-- Demo-only: colour swatches, quality, care and origin for the seeded products.
update variant set color_hex = case lower(color)
    when 'black' then '#1F1D1A' when 'white' then '#F6F3ED' when 'grey' then '#A3A7AB'
    when 'navy' then '#1F2A44' when 'charcoal' then '#4D4943' when 'brown' then '#6B4A32'
    when 'beige' then '#DCCBB2' when 'rose' then '#E0A7A0' when 'cream' then '#EADFCA'
    when 'pink' then '#E3A6A0' when 'mixed' then '#B08D57' end
 where color_hex is null;

update product set
    origin  = 'Korea',
    care    = 'Machine wash cold, tumble dry low. Do not bleach.',
    quality = case
        when fabric_composition ilike '%merino%' then 'Premium merino'
        when fabric_composition ilike '%wool%'   then 'Warm wool blend'
        when fabric_composition ilike '%bamboo%' then 'Breathable bamboo'
        when fabric_composition ilike '%cotton%' then 'Soft combed cotton'
        else 'Quality blend' end
 where origin is null;
