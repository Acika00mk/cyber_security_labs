import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Admin() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, []);

  if (error && !users) return <p className="error">{error}</p>;
  if (!users) return <p className="muted">Loading…</p>;

  return (
    <section>
      <h1>Admin – users</h1>
      <p className="muted">Staff-only view in the UI. The API must enforce the same rule.</p>
      {error && <p className="error">{error}</p>}
      <table className="card table">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>
        </thead>
        <tbody>
          {users.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
