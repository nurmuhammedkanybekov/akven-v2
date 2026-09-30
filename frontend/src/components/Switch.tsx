/** An on/off control that is announced as a switch. Used for "visible in the shop". */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label className="av-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="av-switch__track" aria-hidden="true"><span className="av-switch__thumb" /></span>
      <span>{label}</span>
    </label>
  );
}
