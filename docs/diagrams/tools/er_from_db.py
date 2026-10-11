"""
Draws the complete entity-relationship diagram straight from a migrated PostgreSQL database, so the appendix figure
always matches the schema (04-er-data-model.svg). Run after a new migration:

    python3 docs/diagrams/tools/er_from_db.py "postgresql://akven:akven@localhost:5432/akven" docs/diagrams/04-er-data-model.svg
    node docs/diagrams/tools/render.mjs docs/diagrams/04-er-data-model.svg     # PNG (2x) and PDF next to it

Needs only psql on the PATH. Tables are placed in four bands (identity and system, catalog, orders and pricing, AI
negotiation); every column is listed with its type, PK, FK and NOT NULL; each foreign key is a line from the column to
the table it points at, with a crow's foot on the "many" side. Lines run only through the gaps between the bands (each
in its own lane), and a link that would cross a band goes over the top instead, so no line crosses a table.
"""
import subprocess
import sys
from html import escape

URL, OUT = sys.argv[1], sys.argv[2]

BANDS = [
    ("Identity and system", "#eef1f7", "#9aa6c2", ["app_user", "audit_log_entry", "app_setting", "shop_contact"]),
    ("Orders and pricing", "#fbf5e3", "#d9bc6a", ["customer_order", "order_item", "pickup_point", "price_tier", "shop_policy", "size_chart_row"]),
    ("Catalog", "#fbf5e3", "#d9bc6a", ["catalog_term", "product", "product_image", "variant", "product_embedding"]),
    ("AI negotiation", "#f2eefa", "#a596cf", ["negotiation_session", "negotiation_turn"]),
]
SHORT = {"character varying": "varchar", "timestamp with time zone": "timestamptz", "integer": "int", "boolean": "bool",
         "numeric": "numeric", "USER-DEFINED": "vector", "uuid": "uuid", "text": "text", "jsonb": "jsonb", "date": "date",
         "bigint": "bigint", "smallint": "smallint"}


def query(sql):
    out = subprocess.run(["psql", URL, "-At", "-F", "\t", "-c", sql], check=True, capture_output=True, text=True).stdout
    return [line.split("\t") for line in out.splitlines() if line]


columns = {}
for table, col, typ, nullable, pos in query(
        "select table_name, column_name, data_type, is_nullable, ordinal_position from information_schema.columns "
        "where table_schema = 'public' and table_name <> 'flyway_schema_history' order by table_name, ordinal_position"):
    columns.setdefault(table, []).append((col, SHORT.get(typ, typ), nullable == "NO"))
pks = {(t, c) for t, c in query(
    "select tc.table_name, kcu.column_name from information_schema.table_constraints tc join information_schema.key_column_usage kcu "
    "on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'")}
fks = query(
    "select tc.table_name, kcu.column_name, ccu.table_name from information_schema.table_constraints tc "
    "join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema "
    "join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema "
    "where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public' order by 1, 2")
fk_cols = {(t, c) for t, c, _ in fks}
placed = {t for _, _, _, ts in BANDS for t in ts}
missing = sorted(set(columns) - placed)
if missing:  # a new table nobody placed yet still appears, in the system band
    BANDS[0][3].extend(missing)
version = query("select max(version::int) from flyway_schema_history where success")[0][0]

ROW, HEAD, W, GAP, PAD, BAND_GAP, TOP = 26, 40, 430, 26, 22, 110, 210
boxes, svg = {}, []
x = PAD
band_rects = []
for title, fill, stroke, tables in BANDS:
    y = TOP
    for t in tables:
        h = HEAD + ROW * len(columns[t]) + 10
        boxes[t] = (x + PAD, y, W, h)
        y += h + GAP
    band_rects.append((x, title, fill, stroke, y))
    x += W + 2 * PAD + BAND_GAP
WIDTH = x - BAND_GAP + PAD
HEIGHT = max(r[4] for r in band_rects) + 60

svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}" '
           f"font-family=\"'Liberation Sans', Helvetica, Arial, sans-serif\" role=\"img\" "
           f'aria-label="Entity-relationship diagram of the AKVEN schema after migration V{version}: {len(columns)} tables">')
svg.append(f"<title>AKVEN data model after migration V{version}</title>")
svg.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="#ffffff"/>')
svg.append(f'<text x="{PAD}" y="52" font-size="34" font-weight="700" fill="#1b2340">AKVEN data model, all {len(columns)} tables after migration V{version}</text>')
svg.append(f'<text x="{PAD}" y="84" font-size="20" fill="#5f6678">PK primary key · FK foreign key · bold = NOT NULL · lines run from a foreign key (crow\'s foot, many) to the table it points at (bar, one)</text>')
for bx, title, fill, stroke, bottom in band_rects:
    svg.append(f'<rect x="{bx}" y="{TOP - 14}" width="{W + 2 * PAD}" height="{bottom - TOP + 4}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
    svg.append(f'<text x="{bx + PAD}" y="{TOP - 24}" font-size="22" font-weight="700" fill="#1b2340">{escape(title)}</text>')


def row_y(table, col):
    names = [c for c, _, _ in columns[table]]
    return boxes[table][1] + HEAD + ROW * names.index(col) + ROW / 2


band_of = {t: i for i, (_, _, _, ts) in enumerate(BANDS) for t in ts}
band_x = [bx for bx, *_ in band_rects]
lanes_used = {}


def lane(gutter):
    """The next free vertical lane in the gap to the right of band `gutter`."""
    k = lanes_used.get(gutter, 0)
    lanes_used[gutter] = k + 1
    return band_x[gutter] + W + 2 * PAD + 12 + k * 12


top_lanes = [0]
lines = []
for table, col, target in fks:
    sx, sy, sw, _ = boxes[table]
    tx, ty, tw, _ = boxes[target]
    y1, y2 = row_y(table, col), ty + HEAD / 2
    a, b = band_of[table], band_of[target]
    if a == b:                       # same band: out to the right-hand gap and back
        x1, x2 = sx + sw, tx + tw
        lx = lane(a)
        path = f"M{x1},{y1} H{lx} V{y2} H{x2}"
        d1, d2 = 1, 1
    elif abs(a - b) == 1:            # neighbouring bands: through the gap between them
        left = min(a, b)
        lx = lane(left)
        x1 = sx + sw if a < b else sx
        x2 = tx if a < b else tx + tw
        path = f"M{x1},{y1} H{lx} V{y2} H{x2}"
        d1, d2 = (1, -1) if a < b else (-1, 1)
    else:                            # further apart: up into the lane above the bands, across, and down
        x1 = sx + sw if a < b else sx
        ly = TOP - 70 - top_lanes[0] * 12
        top_lanes[0] += 1
        lx1 = lane(a if a < b else a - 1)
        x2 = tx + tw / 2
        path = f"M{x1},{y1} H{lx1} V{ly} H{x2} V{ty}"
        d1, d2 = (1 if a < b else -1), 0
    lines.append(f'<path d="{path}" fill="none" stroke="#6b7390" stroke-width="2"/>')
    fx = x1 + d1 * 14   # crow's foot at the foreign key (many)
    lines.append(f'<path d="M{fx},{y1} L{x1},{y1 - 8} M{fx},{y1} L{x1},{y1} M{fx},{y1} L{x1},{y1 + 8}" stroke="#6b7390" stroke-width="2"/>')
    if d2:              # a bar at the referenced table (one)
        lines.append(f'<path d="M{x2 + d2 * 10},{y2 - 9} L{x2 + d2 * 10},{y2 + 9}" stroke="#6b7390" stroke-width="2"/>')
    else:
        lines.append(f'<path d="M{x2 - 9},{ty - 10} L{x2 + 9},{ty - 10}" stroke="#6b7390" stroke-width="2"/>')

for table, (bx, by, bw, bh) in boxes.items():
    svg.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="8" fill="#ffffff" stroke="#1b2340" stroke-width="2"/>')
    svg.append(f'<path d="M{bx},{by + HEAD} H{bx + bw}" stroke="#1b2340" stroke-width="1.5"/>')
    svg.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{HEAD}" rx="8" fill="#1b2340"/>')
    svg.append(f'<rect x="{bx}" y="{by + HEAD - 10}" width="{bw}" height="10" fill="#1b2340"/>')
    svg.append(f'<text x="{bx + 14}" y="{by + 27}" font-size="21" font-weight="700" fill="#ffffff">{escape(table)}</text>')
    for i, (col, typ, notnull) in enumerate(columns[table]):
        cy = by + HEAD + ROW * i + 19
        tags = ("PK " if (table, col) in pks else "") + ("FK" if (table, col) in fk_cols else "")
        weight = "700" if notnull else "400"
        svg.append(f'<text x="{bx + 14}" y="{cy}" font-size="18" fill="#a07a1f" font-weight="700">{tags.strip()}</text>')
        svg.append(f'<text x="{bx + 64}" y="{cy}" font-size="18" font-weight="{weight}" fill="#1b2340">{escape(col)}</text>')
        svg.append(f'<text x="{bx + bw - 14}" y="{cy}" font-size="17" fill="#5f6678" text-anchor="end">{escape(typ)}</text>')

svg[4:4] = lines  # lines under the tables
svg.append("</svg>")
with open(OUT, "w") as f:
    f.write("\n".join(svg) + "\n")
print(f"{OUT}: {len(columns)} tables, {len(fks)} foreign keys, schema V{version}, {WIDTH}x{HEIGHT}")
