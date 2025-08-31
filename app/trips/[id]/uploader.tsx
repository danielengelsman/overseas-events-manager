'use client';
import { useState } from 'react';

export default function Uploader({ tripId }: { tripId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

  async function upload() {
    if (!file) return;
    setStatus('Requesting signed URL...');
    const res = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type })
    });
    const { signedUrl } = await res.json();
    setStatus('Uploading...');
    const put = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!put.ok) { setStatus('Upload failed'); return; }
    setStatus('Uploaded! (parsing not implemented in starter)');
  }

  return (
    <div>
      <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
      <button onClick={upload} disabled={!file}>Upload</button>
      <div>{status}</div>
    </div>
  );
}
