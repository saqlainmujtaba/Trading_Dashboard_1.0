import { useState } from 'react';
import FormField from '../common/FormField';
import SortControl from '../common/SortControl';
import { sortRows } from '../common/sortRows';

const plannedSortOptions = [
  { value: 'company.asc', label: 'Company: A to Z' },
  { value: 'company.desc', label: 'Company: Z to A' },
  { value: 'size.desc', label: 'Account size: high to low' },
  { value: 'size.asc', label: 'Account size: low to high' },
  { value: 'type.asc', label: 'Challenge type: A to Z' },
  { value: 'purchaseDate.desc', label: 'Purchase date: newest first' },
  { value: 'purchaseDate.asc', label: 'Purchase date: oldest first' },
  { value: 'cost.desc', label: 'Cost: high to low' },
  { value: 'cost.asc', label: 'Cost: low to high' },
  { value: 'priority.desc', label: 'Priority: high to low' },
  { value: 'priority.asc', label: 'Priority: low to high' },
  { value: 'status.asc', label: 'Status: A to Z' },
  { value: 'notes.asc', label: 'Notes: A to Z' },
  { value: 'notes.desc', label: 'Notes: Z to A' },
];

const PlannedSection = ({
  plannedAccounts,
  plannedForm,
  setPlannedForm,
  editingPlannedId,
  setEditingPlannedId,
  defaultPlannedAccountForm,
  handlePlannedSubmit,
  formatCurrency,
  deletePlanned,
  showPlannedForm,
  setShowPlannedForm,
  confirmDelete,
}) => {
  const [sortBy, setSortBy] = useState('priority.desc');
  const sortedPlannedAccounts = sortRows(plannedAccounts, sortBy);

  return (
  <section id="planned" className="section-block">
    <div className="section-head">
      <h2 data-tour="planned-heading">Future / Planned Accounts</h2>
      <div className="section-actions">
        <SortControl value={sortBy} options={plannedSortOptions} onChange={setSortBy} label="Sort planned accounts" />
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (!showPlannedForm) {
              setShowPlannedForm(true);
              return;
            }
            setShowPlannedForm(false);
            setEditingPlannedId(null);
            setPlannedForm(defaultPlannedAccountForm);
          }}
        >
          {showPlannedForm ? 'Close form' : 'Add plan'}
        </button>
        <span className="section-tag">Upcoming</span>
      </div>
    </div>

    {showPlannedForm && (
      <div className="modal-backdrop" onClick={() => { setShowPlannedForm(false); setEditingPlannedId(null); setPlannedForm(defaultPlannedAccountForm); }}>
        <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{editingPlannedId ? 'Edit planned account' : 'New planned account'}</h3>
            <button type="button" className="icon-close" onClick={() => { setShowPlannedForm(false); setEditingPlannedId(null); setPlannedForm(defaultPlannedAccountForm); }}>×</button>
          </div>
          <form className="crud-form modal-form" onSubmit={handlePlannedSubmit}>
            <div className="form-grid">
              <FormField label="Company" required>
                <input value={plannedForm.company} onChange={(e) => setPlannedForm({ ...plannedForm, company: e.target.value })} placeholder="e.g. MyFundedFX" required />
              </FormField>
              <FormField label="Account size">
                <input type="number" value={plannedForm.size} onChange={(e) => setPlannedForm({ ...plannedForm, size: Number(e.target.value) })} placeholder="100000" />
              </FormField>
              <FormField label="Challenge type">
                <select value={plannedForm.type} onChange={(e) => setPlannedForm({ ...plannedForm, type: e.target.value })}>
                  <option>Instant</option>
                  <option>2-Step</option>
                  <option>Evaluation</option>
                </select>
              </FormField>
              <FormField label="Expected purchase date">
                <input type="date" value={plannedForm.purchaseDate} onChange={(e) => setPlannedForm({ ...plannedForm, purchaseDate: e.target.value })} />
              </FormField>
              <FormField label="Expected cost">
                <input type="number" value={plannedForm.cost} onChange={(e) => setPlannedForm({ ...plannedForm, cost: Number(e.target.value) })} placeholder="500" />
              </FormField>
              <FormField label="Priority">
                <select value={plannedForm.priority} onChange={(e) => setPlannedForm({ ...plannedForm, priority: e.target.value })}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </FormField>
              <FormField label="Notes" className="wide-field">
                <input value={plannedForm.notes} onChange={(e) => setPlannedForm({ ...plannedForm, notes: e.target.value })} placeholder="Any notes or buying criteria" />
              </FormField>
            </div>
            <div className="form-actions">
              <button className="primary-btn" type="submit">{editingPlannedId ? 'Update plan' : 'Save plan'}</button>
              <button type="button" className="secondary-btn" onClick={() => { setShowPlannedForm(false); setEditingPlannedId(null); setPlannedForm(defaultPlannedAccountForm); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )}

    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Account size</th>
            <th>Challenge type</th>
            <th>Expected purchase date</th>
            <th>Expected cost</th>
            <th>Priority</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlannedAccounts.map((item) => (
            <tr key={item._id}>
              <td>{item.company}</td>
              <td>{formatCurrency(item.size)}</td>
              <td>{item.type}</td>
              <td>{item.purchaseDate}</td>
              <td>{formatCurrency(item.cost)}</td>
              <td><span className="priority-tag">{item.priority}</span></td>
              <td>{item.notes}</td>
              <td className="action-stack">
                <button className="secondary-btn" type="button" onClick={() => { setPlannedForm(item); setEditingPlannedId(item._id); setShowPlannedForm(true); }}>Edit</button>
                <button
                  className="danger-btn"
                  type="button"
                  onClick={() => {
                    confirmDelete({
                      title: 'Delete planned account?',
                      message: `This will permanently remove "${item.company}" from your planned list. This action cannot be undone.`,
                      onConfirm: () => deletePlanned(item._id),
                    });
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
  );
};

export default PlannedSection;
