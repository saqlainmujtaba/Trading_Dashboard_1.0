import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Sidebar from '../layout/Sidebar';

const CommunityPage = ({ user, onLogout, theme, onToggleTheme }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [connections, setConnections] = useState({ friends: [], incoming: [], outgoing: [] });
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const loadConnections = async () => {
    try {
      const [connectionResponse, conversationResponse] = await Promise.all([
        api.get('/community/connections'), api.get('/community/conversations'),
      ]);
      setConnections(connectionResponse.data);
      setConversations(conversationResponse.data);
    }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not load your community.'); }
  };

  useEffect(() => { loadConnections(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try { setResults((await api.get('/community/users', { params: { q: query } })).data); }
      catch (requestError) { setError(requestError.response?.data?.message || 'Could not search users.'); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadMessages = async (target) => {
    if (!target) return;
    try { setMessages((await api.get(`/community/messages/${target._id}`)).data); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not load chat.'); }
  };
  useEffect(() => {
    if (!activeChat) return undefined;
    loadMessages(activeChat);
    const timer = window.setInterval(() => loadMessages(activeChat), 8000);
    return () => window.clearInterval(timer);
  }, [activeChat?._id]);

  const sendRequest = async (target) => {
    try {
      await api.post(`/community/requests/${target._id}`);
      setResults((current) => current.map((person) => person._id === target._id ? { ...person, connection: 'sent' } : person));
      await loadConnections();
    }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not send friend request.'); }
  };
  const respond = async (target, status) => {
    try { await api.patch(`/community/requests/${target.requestId}`, { status }); await loadConnections(); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not update request.'); }
  };
  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeChat) return;
    try {
      const response = await api.post(`/community/messages/${activeChat._id}`, { text });
      setMessages((current) => [...current, response.data]);
      setDraft('');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not send message.'); }
  };

  const userCard = (person, type) => (
    <article className="community-user-row" key={person._id}>
      <div><strong>{person.tradingAlias || person.name}</strong><span className="muted">{person.country || person.name}</span>{person.bio && <small>{person.bio}</small>}</div>
      {type === 'incoming' ? <div className="community-actions"><button className="primary-btn" onClick={() => respond(person, 'accepted')}>Accept</button><button className="secondary-btn" onClick={() => respond(person, 'rejected')}>Decline</button></div>
        : type === 'friend' ? <button className="secondary-btn" onClick={() => setActiveChat(person)}>Chat</button>
          : <div className="community-actions">{user?.role === 'admin' && <button className="secondary-btn" onClick={() => setActiveChat(person)}>Chat</button>}{type === 'sent' ? <span className="muted">Request sent</span> : <button className="secondary-btn" onClick={() => sendRequest(person)}>Add friend</button>}</div>}
    </article>
  );

  return (
    <div className="app-shell">
      <Sidebar user={user} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      <main className="content">
        <header className="topbar"><div><p className="eyebrow">Connect with traders</p><h1>Community & messages</h1></div><Link className="secondary-btn" to="/">Back to dashboard</Link></header>
        {error && <div className="error-box" role="alert">{error}<button className="icon-close" onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
        <section className="section-block community-discover">
          <div className="section-head"><div><p className="eyebrow">Find traders</p><h2>Discover people</h2></div></div>
          <input aria-label="Search traders" placeholder="Search by name or trading alias" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="community-list">{results.map((person) => userCard(person, person.connection === 'friend' ? 'friend' : person.connection === 'sent' ? 'sent' : person.connection === 'received' ? 'incoming' : 'new'))}</div>
        </section>
        <section className="section-block community-columns">
          <div className="profile-card"><h2>Friend requests</h2><h3>Incoming</h3>{connections.incoming.map((person) => userCard(person, 'incoming'))}{!connections.incoming.length && <p className="muted">No incoming requests.</p>}<h3>Sent</h3>{connections.outgoing.map((person) => userCard(person, 'sent'))}</div>
          <div className="profile-card"><h2>Friends</h2><div className="community-list">{connections.friends.map((person) => userCard(person, 'friend'))}{!connections.friends.length && <p className="muted">Add a trader to start building your friend list.</p>}</div></div>
        </section>
        {!!conversations.length && <section className="section-block profile-card"><h2>Recent chats</h2><div className="community-list">{conversations.map((person) => <article className="community-user-row" key={person._id}><div><strong>{person.tradingAlias || person.name}{person.isAdmin ? ' · Admin' : ''}</strong><small>{person.lastMessage}</small></div><button className="secondary-btn" onClick={() => setActiveChat(person)}>Open chat</button></article>)}</div></section>}
        {activeChat && <section className="section-block profile-card community-chat"><div className="section-head"><div><p className="eyebrow">Direct messages</p><h2>{activeChat.tradingAlias || activeChat.name}</h2></div><button className="secondary-btn" onClick={() => setActiveChat(null)}>Close chat</button></div><div className="community-message-list" aria-live="polite">{messages.map((message) => <div className={`community-message ${String(message.from) === String(user?._id) ? 'mine' : ''}`} key={message._id}><p>{message.text}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div>)}{!messages.length && <p className="muted">No messages yet. Say hello.</p>}</div><form className="community-send-form" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} placeholder="Write a message" aria-label="Message" /><button className="primary-btn" type="submit">Send</button></form></section>}
      </main>
    </div>
  );
};

export default CommunityPage;
