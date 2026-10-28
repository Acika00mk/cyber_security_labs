import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Profile({ user, onProfileChange }) {
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const updated = await api.updateProfile({ name });
      onProfileChange(updated);
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="narrow">
      <h1>Profile</h1>
      <p className="muted">This form only edits your display name. Check what the server actually accepts.</p>
      <form onSubmit={submit} className="card form">
        <label>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </label>
        <p className="muted">Email: {user?.email}</p>
        <p className="muted">Role: {user?.role}</p>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit">Save</button>
      </form>
    </section>
  );
}
