'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Trip = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location_city: string | null;
  location_country: string | null;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [orgId, setOrgId] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchTrips();
  }, []);

  async function fetchTrips() {
    const { data: sess } = await supabase.auth.getUser();
    const user = sess.user;
    if (!user) return;
    // get user's first org via memberships
    const { data: memberships } = await supabase.from('memberships').select('org_id').eq('user_id', user.id).limit(1);
    const orgId = memberships?.[0]?.org_id;
    setOrgId(orgId || '');
    if (!orgId) return;
    const { data, error } = await supabase.from('trips').select('*').eq('org_id', orgId).order('start_date', { ascending: false });
    if (!error && data) setTrips(data as any);
  }

  async function createTrip(e: any) {
    e.preventDefault();
    if (!orgId) { alert('No organization found. Insert one in Supabase and add yourself to memberships.'); return; }
    const { error } = await supabase.from('trips').insert([{
      org_id: orgId, title, start_date: start, end_date: end, location_city: city || null, location_country: country || null
    }]);
    if (error) alert(error.message);
    setTitle(''); setStart(''); setEnd(''); setCity(''); setCountry('');
    fetchTrips();
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2>Trips</h2>
      <form onSubmit={createTrip} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} required />
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={start} onChange={e=>setStart(e.target.value)} required />
          <input type="date" value={end} onChange={e=>setEnd(e.target.value)} required />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
          <input placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} />
        </div>
        <button type="submit">Create Trip</button>
      </form>

      <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {trips.map(t => (
          <li key={t.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Link href={`/trips/${t.id}`}><strong>{t.title}</strong></Link>
                <div>{t.start_date} → {t.end_date} · {t.location_city || ''}{t.location_city && t.location_country ? ', ' : ''}{t.location_country || ''}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
