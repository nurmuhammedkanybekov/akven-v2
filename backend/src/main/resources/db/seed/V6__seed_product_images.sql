-- Demo-only: one placeholder image per seeded product. The files are produced by the frontend
-- design system (frontend/public/media/products/<slug>-1.svg), so these paths are stable.
insert into product_image (product_id, url, alt, position)
select id, '/media/products/' || slug || '-1.svg', name || ' - Ak&Ven', 0 from product;
