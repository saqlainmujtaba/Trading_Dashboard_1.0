const SortControl = ({ value, options, onChange, label = 'Sort by' }) => (
  <label className="sort-control">
    <span>{label}</span>
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

export default SortControl;
