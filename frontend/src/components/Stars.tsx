import { useId } from "react";
import { useT } from "../i18n/I18n";

const STAR = "M12 2.8l2.7 5.9 6.4.7-4.8 4.4 1.3 6.3L12 16.9l-5.6 3.2 1.3-6.3-4.8-4.4 6.4-.7z";

/** A rating shown as five stars, partly filled for a half; read out as "4.5 out of 5". */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const { t } = useT();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <span className="av-stars" role="img" aria-label={t("rv.outOf", { n: value.toFixed(1).replace(/\.0$/, "") })} style={{ height: size }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <defs><linearGradient id={`${id}-${i}`}><stop offset={fill} stopColor="currentColor" /><stop offset={fill} stopColor="transparent" /></linearGradient></defs>
            <path d={STAR} fill={`url(#${id}-${i})`} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        );
      })}
    </span>
  );
}

/** Choosing 1 to 5 stars: a radio group, so it works with the keyboard and is read out properly. */
export function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const { t } = useT();
  const name = useId();
  return (
    <fieldset className="av-starinput">
      <legend className="av-label">{label}</legend>
      <div className="av-starinput__row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`av-starinput__star${n <= value ? " is-on" : ""}`} title={t("rv.nStars", { n })}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
            <span className="av-visually-hidden">{t("rv.nStars", { n })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
