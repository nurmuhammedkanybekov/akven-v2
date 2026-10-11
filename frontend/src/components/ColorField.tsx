import { useId } from "react";
import { useT } from "../i18n/I18n";

export const COLOR_PRESETS: Array<{ name: string; hex: string }> = [
  { name: "Black", hex: "#1F1D1A" }, { name: "White", hex: "#F6F3ED" }, { name: "Grey", hex: "#A3A7AB" },
  { name: "Charcoal", hex: "#4D4943" }, { name: "Navy", hex: "#1F2A44" }, { name: "Brown", hex: "#6B4A32" },
  { name: "Beige", hex: "#DCCBB2" }, { name: "Cream", hex: "#EADFCA" }, { name: "Rose", hex: "#E0A7A0" },
  { name: "Sky", hex: "#8FB8D8" }, { name: "Green", hex: "#7FB69B" }, { name: "Gold", hex: "#C9A24B" },
];

interface Props { name: string; hex: string | null; onChange: (next: { name: string; hex: string | null }) => void; label?: string }

/**
 * Colour name plus a swatch. One click on a preset fills both; the colour wheel and the name stay editable for
 * anything else ("Sage", "Dusty blue"). The hex is what the shop draws as the swatch.
 */
export function ColorField({ name, hex, onChange, label }: Props) {
  const id = useId();
  const { t } = useT();
  const what = label ?? t("a.color");
  return (
    <div className="av-colorfield">
      <div className="av-colorfield__row">
        <input className="av-input" id={`${id}-name`} aria-label={t("a.color.name", { what })} placeholder={t("a.color.eg")} value={name}
               onChange={(e) => onChange({ name: e.target.value, hex })} />
        <input className="av-colorfield__picker" type="color" aria-label={t("a.color.swatch", { what })} value={hex ?? "#cccccc"}
               onChange={(e) => onChange({ name, hex: e.target.value.toUpperCase() })} />
      </div>
      <div className="av-colorfield__presets" role="group" aria-label={t("a.color.common")}>
        {COLOR_PRESETS.map((p) => (
          <button key={p.hex} type="button" className="av-swatch" title={p.name} aria-label={p.name}
                  aria-pressed={hex?.toUpperCase() === p.hex} style={{ background: p.hex }}
                  onClick={() => onChange({ name: name.trim() ? name : p.name, hex: p.hex })} />
        ))}
      </div>
    </div>
  );
}
