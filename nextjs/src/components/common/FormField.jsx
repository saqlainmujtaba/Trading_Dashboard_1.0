const FormField = ({ label, required = false, children, className = '', hint = '' }) => (
  <label className={`field-group ${className}`.trim()}>
    <span>
      {label}
      {required ? ' *' : ''}
    </span>
    {hint && <small className="field-hint">{hint}</small>}
    {children}
  </label>
);

export default FormField;
