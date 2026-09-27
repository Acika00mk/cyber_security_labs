import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      onLogin(await api.login(email, password));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="narrow">
      <h1>Log in</h1>
      <form onSubmit={submit} className="card form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Log in</button>
      </form>
      <div className="card hint">
        <strong>Lab accounts</strong>
        <ul>
          <li>alice@shoplab.test / alice123</li>
          <li>bob@shoplab.test / bob123</li>
        </ul>
      </div>
    </section>
  );
}
