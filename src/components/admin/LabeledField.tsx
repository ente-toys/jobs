interface LabeledFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  rows?: number;
  tallTextarea?: boolean;
}

export function LabeledField({
  label,
  value,
  onChange,
  textarea = false,
  disabled = false,
  fullWidth = false,
  rows = 4,
  tallTextarea = false,
}: LabeledFieldProps) {
  return (
    <label className={`admin-field ${fullWidth ? "is-full-width" : ""}`}>
      <span>{label}</span>
      {textarea ? (
        <textarea
          className={`admin-input admin-textarea ${tallTextarea ? "is-tall" : ""}`}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          value={value}
        />
      ) : (
        <input
          className="admin-input"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      )}
    </label>
  );
}
