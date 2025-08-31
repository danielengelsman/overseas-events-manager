'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Uploader from './uploader';

type Trip = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location_city: string | null;
  location_country: string | null;
  org_id: string;
};

export default function TripPage({ params }: { params: { id: string }}) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [message, setMessage] = useState('Create a flight for john@example.com: BA 162 TLV→LHR on 2025-11-10 dep 07:00 arr 10:00, PNR XYZ123.');
  const [chat, setChat] = useState<{role:'user'|'assistant', content:string}[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadTrip();
  }, [params.id]);

  async function loadTrip() {
    const { data, error } = await supabase.from('trips').select('*').eq('id', params.id).single();
    if (!error && data) setTrip(data as any);
  }

  async function sendToAI() {
    if (!trip || !user) return;
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId: trip.org_id, userId: user.id, tripId: trip.id, messages: [...chat, { role:'user', content: message }] })
    });
    const data = await res.json();
    setChat(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: data.reply }]);
    setMessage('');
  }

  if (!trip) return <p>Loading...</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
      <div>
        <h2>{trip.title}</h2>
        <div>{trip.start_date} → {trip.end_date} · {trip.location_city || ''}{trip.location_city && trip.location_country ? ', ' : ''}{trip.location_country || ''}</div>
        <h3 style={{ marginTop: 20 }}>Flights</h3>
        <h3 style={{ marginTop: 20 }}>Documents</h3>
<Uploader tripId={trip.id} />
        <TripFlights tripId={trip.id} />
      </div>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h3>AI Copilot</h3>
        <div style={{ height: 220, overflowY: 'auto', border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
          {chat.map((m, i) => <div key={i}><strong>{m.role}:</strong> {m.content}</div>)}
        </div>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} style={{ width: '100%' }} />
        <button onClick={sendToAI} style={{ marginTop: 8 }}>Send</button>
      </div>
    </div>
  );
}

function TripFlights({ tripId }: { tripId: string }) {
  const [flights, setFlights] = useState<any[]>([]);
  useEffect(() => { load(); }, [tripId]);
  async function load() {
    const { data } = await supabase.from('flights').select('*').eq('trip_id', tripId).order('dep_time', { ascending: true });
    setFlights(data || []);
  }
  return (
    <ul>
      {flights.map(f => (
        <li key={f.id}>
          {f.airline} {f.flight_no} — {f.dep_airport} → {f.arr_airport} ({f.dep_time} → {f.arr_time}) PNR {f.pnr || '-'}
        </li>
      ))}
      {flights.length === 0 && <li>No flights yet.</li>}
    </ul>
  );
}
