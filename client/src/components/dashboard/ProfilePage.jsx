import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';

const defaultProfileData = {
  fullName: '',
  tradingAlias: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  timezone: 'GMT+5',
  riskProfile: 'Moderate',
  tradingStyle: 'Swing',
  experience: '1-3 years',
  primaryMarkets: 'Forex',
  strategy: 'Trend following',
  preferredPairs: 'EURUSD, GBPUSD',
  bio: '',
  goals: '',
  customFields: [],
};

const emptyCustomField = { id: '', label: '', value: '' };

const ProfilePage = ({ user, onLogout, theme, onToggleTheme }) => {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('profileData');
    if (!saved) {
      return {
        ...defaultProfileData,
        fullName: user?.name || '',
        email: user?.email || '',
      };
    }

    try {
      return { ...defaultProfileData, ...JSON.parse(saved) };
    } catch {
      return {
        ...defaultProfileData,
        fullName: user?.name || '',
        email: user?.email || '',
      };
    }
  });
  const [customField, setCustomField] = useState(emptyCustomField);
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);

  useEffect(() => {
    localStorage.setItem('profileData', JSON.stringify(profile));
  }, [profile]);

  const profileSummary = useMemo(() => [
    { label: 'Full Name', value: profile.fullName || 'Not added' },
    { label: 'Trading Alias', value: profile.tradingAlias || 'Not added' },
    { label: 'Email', value: profile.email || 'Not added' },
    { label: 'Phone', value: profile.phone || 'Not added' },
    { label: 'Country', value: profile.country || 'Not added' },
    { label: 'City', value: profile.city || 'Not added' },
    { label: 'Timezone', value: profile.timezone || 'Not added' },
    { label: 'Risk Profile', value: profile.riskProfile || 'Not added' },
    { label: 'Trading Style', value: profile.tradingStyle || 'Not added' },
    { label: 'Primary Markets', value: profile.primaryMarkets || 'Not added' },
  ], [profile]);

  const updateField = (field, value) => {
    setDraftProfile((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = () => {
    localStorage.setItem('profileData', JSON.stringify(draftProfile));
    setProfile(draftProfile);
    setIsEditing(false);
  };

  const openProfileEditor = () => {
    setDraftProfile(profile);
    setIsEditing(true);
  };

  const cancelProfileEdit = () => {
    setDraftProfile(profile);
    setIsEditing(false);
  };

  const addCustomField = () => {
    const label = customField.label.trim();
    const value = customField.value.trim();

    if (!label || !value) return;

    setDraftProfile((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), { id: Date.now().toString(), label, value }],
    }));
    setCustomField(emptyCustomField);
  };

  const updateCustomField = (id, field, value) => {
    setDraftProfile((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeCustomField = (id) => {
    setDraftProfile((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((item) => item.id !== id),
    }));
  };

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      />

      <main className="content profile-page">
        <header className="topbar">
          <div>
            <p className="eyebrow">Personal profile</p>
            <h1>Profile & account details</h1>
          </div>
          <div className="topbar-actions">
            <Link className="secondary-btn" to="/dashboard">Back to dashboard</Link>
          </div>
        </header>

        <section className="profile-shell">
          <div className="profile-card hero-card">
            <div className="profile-avatar">{(profile.fullName || user?.name || 'T').charAt(0).toUpperCase()}</div>
            <div className="profile-identity">
              <p className="eyebrow muted-text">Trader profile</p>
              <h2>{profile.fullName || user?.name || 'Trader Profile'}</h2>
              <p>{profile.tradingAlias || 'Trading alias not set'}</p>
            </div>
            <button className="primary-btn" onClick={openProfileEditor}>
              Edit profile
            </button>
          </div>

          <div className="profile-grid">
            <div className="profile-card">
              <div className="section-head small-head">
                <h3>Trader essentials</h3>
                <span className="section-tag">About me</span>
              </div>

              <div className="detail-list">
                {profileSummary.map((item) => (
                  <div key={item.label} className="detail-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-card">
              <div className="section-head small-head">
                <h3>Bio & goals</h3>
                <span className="section-tag">About</span>
              </div>

              <div className="profile-copy-block">
                <p><strong>Experience:</strong> {profile.experience || 'Not set'}</p>
                <p><strong>Trading style:</strong> {profile.tradingStyle || 'Not set'}</p>
                <p><strong>Primary markets:</strong> {profile.primaryMarkets || 'Not set'}</p>
                <p><strong>Strategy:</strong> {profile.strategy || 'Not set'}</p>
                <p><strong>Preferred pairs:</strong> {profile.preferredPairs || 'Not set'}</p>
                <p><strong>Bio:</strong> {profile.bio || 'No bio added yet.'}</p>
                <p><strong>Goals:</strong> {profile.goals || 'No goals added yet.'}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="modal-backdrop" onClick={cancelProfileEdit}>
              <div className="modal-panel profile-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                  <h3>Edit trader profile</h3>
                  <button type="button" className="icon-close" aria-label="Close profile editor" onClick={cancelProfileEdit}>×</button>
                </div>
              <div className="profile-form-grid">
                <label className="field-group">
                  <span>Full name</span>
                  <input value={draftProfile.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Trading alias</span>
                  <input value={draftProfile.tradingAlias} onChange={(e) => updateField('tradingAlias', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Email</span>
                  <input value={draftProfile.email} onChange={(e) => updateField('email', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Phone</span>
                  <input value={draftProfile.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Country</span>
                  <input value={draftProfile.country} onChange={(e) => updateField('country', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>City</span>
                  <input value={draftProfile.city} onChange={(e) => updateField('city', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Timezone</span>
                  <input value={draftProfile.timezone} onChange={(e) => updateField('timezone', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Risk profile</span>
                  <select value={draftProfile.riskProfile} onChange={(e) => updateField('riskProfile', e.target.value)}>
                    <option>Low</option>
                    <option>Moderate</option>
                    <option>High</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Trading style</span>
                  <select value={draftProfile.tradingStyle} onChange={(e) => updateField('tradingStyle', e.target.value)}>
                    <option>Scalp</option>
                    <option>Day</option>
                    <option>Swing</option>
                    <option>Position</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Experience</span>
                  <select value={draftProfile.experience} onChange={(e) => updateField('experience', e.target.value)}>
                    <option>Less than 1 year</option>
                    <option>1-3 years</option>
                    <option>3-5 years</option>
                    <option>5+ years</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Primary markets</span>
                  <input value={draftProfile.primaryMarkets} onChange={(e) => updateField('primaryMarkets', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Strategy</span>
                  <input value={draftProfile.strategy} onChange={(e) => updateField('strategy', e.target.value)} />
                </label>
                <label className="field-group">
                  <span>Preferred pairs</span>
                  <input value={draftProfile.preferredPairs} onChange={(e) => updateField('preferredPairs', e.target.value)} />
                </label>
                <label className="field-group wide-field">
                  <span>Bio</span>
                  <textarea value={draftProfile.bio} onChange={(e) => updateField('bio', e.target.value)} rows={4} />
                </label>
                <label className="field-group wide-field">
                  <span>Goals</span>
                  <textarea value={draftProfile.goals} onChange={(e) => updateField('goals', e.target.value)} rows={4} />
                </label>
              </div>

              <div className="custom-fields-block">
                <div className="section-head small-head">
                  <h4>Extra profile items</h4>
                  <span className="section-tag">Add / remove</span>
                </div>

                <div className="custom-field-row">
                  <input
                    placeholder="Label e.g. Broker"
                    value={customField.label}
                    onChange={(e) => setCustomField((prev) => ({ ...prev, label: e.target.value }))}
                  />
                  <input
                    placeholder="Value e.g. FTMO"
                    value={customField.value}
                    onChange={(e) => setCustomField((prev) => ({ ...prev, value: e.target.value }))}
                  />
                  <button type="button" className="primary-btn" onClick={addCustomField}>Add item</button>
                </div>

                {(draftProfile.customFields || []).length > 0 && (
                  <div className="custom-item-list">
                    {(draftProfile.customFields || []).map((item) => (
                      <div key={item.id} className="custom-item">
                        <input
                          value={item.label}
                          onChange={(e) => updateCustomField(item.id, 'label', e.target.value)}
                        />
                        <input
                          value={item.value}
                          onChange={(e) => updateCustomField(item.id, 'value', e.target.value)}
                        />
                        <button type="button" className="danger-btn" onClick={() => removeCustomField(item.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions profile-actions">
                <button type="button" className="secondary-btn" onClick={cancelProfileEdit}>Cancel</button>
                <button type="button" className="primary-btn" onClick={saveProfile}>Save profile</button>
              </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
