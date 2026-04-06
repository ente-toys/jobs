interface LabeledFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  disabled?: boolean;
}

export function LabeledField({
  label,
  value,
  onChange,
  textarea = false,
  disabled = false,
}: LabeledFieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {textarea ? (
        <textarea
          className="admin-input admin-textarea"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
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
