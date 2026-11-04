import { useState } from 'react';
import { api } from '../api.js';

export default function Tools() {
  const [url, setUrl] = useState('http://127.0.0.1:3000/api/products');
  const [fetchResult, setFetchResult] = useState('');
  const [fileName, setFileName] = useState('avatar.jpg');
  const [fileBytes, setFileBytes] = useState('');
  const [uploadResult, setUploadResult] = useState('');
  const [error, setError] = useState('');

  async function runFetch(event) {
    event.preventDefault();
    setError('');
    setFetchResult('');
    try {
      const data = await api.fetchUrl(url);
      setFetchResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message);
    }
  }

  async function runUpload(event) {
    event.preventDefault();
    setError('');
    setUploadResult('');
    try {
      const blob = new Blob([fileBytes || 'lab upload'], { type: 'application/octet-stream' });
      const data = await api.uploadFile(fileName, blob);
      setUploadResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="narrow">
      <h1>Support tools</h1>
      <p className="muted">
        Staff-only utilities for this lab. Treat URL fetch and file upload as untrusted input on the server.
      </p>

      <form onSubmit={runFetch} className="card form">
        <h2>Preview URL</h2>
        <label>
          URL
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} required />
        </label>
        <button type="submit">Fetch from server</button>
      </form>

      <form onSubmit={runUpload} className="card form">
        <h2>Upload file</h2>
        <label>
          Filename (sent to server)
          <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} required />
        </label>
        <label>
          File contents (text)
          <textarea
            rows={3}
            value={fileBytes}
            onChange={(e) => setFileBytes(e.target.value)}
            placeholder="Optional text body"
          />
        </label>
        <button type="submit">Upload</button>
      </form>

      {error && <p className="error">{error}</p>}
      {fetchResult && (
        <pre className="card code">{fetchResult}</pre>
      )}
      {uploadResult && (
        <pre className="card code">{uploadResult}</pre>
      )}
    </section>
  );
}
