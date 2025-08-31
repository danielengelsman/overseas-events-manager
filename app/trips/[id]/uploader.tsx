'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient'; // ← TOP-LEVEL import

export default function Uploader({ tripId }: { tripId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

  async function upload() {
    if (!file) return;
    setStatus('Requesting signed URL...');
    const res = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name }) // contentType not needed
    });
    const { path, token, error } = await res.json();
    if (error) { setStatus('Error: ' + error); return; }

    setStatus('Uploading...');
    const { error: upErr } = await supabase
      .storage
      .from('documents')
      .uploadToSignedUrl(path, token, file, { upsert: false });

    if (upErr) { setStatus('Upload failed: ' + upErr.message); return; }
    setStatus('Uploaded! (parsing not implemented in starter)');
  }

  return (
    <div>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button onClick={upload} disabled={!file}>Upload</button>
      <div>{status}</div>
    </div>
  );
}
