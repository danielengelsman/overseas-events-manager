'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Trip = { id:string; title:string; start_date:string; end_date:string; location_city:string|null; location_country:string|null; };

export default function Dashboard() {
  const [orgId, setOrgId] = useState<string>('');
  const [upcoming, setUpcoming] = useState<Trip[]>([]);
  const [count, setCount] = useState<number>(0);

  useEffect(() => { init(); }, []);
  async function init() {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return;
    const { data: mem } = await supabase.from('memberships').select('org_id').eq('user_id', uid).limit(1);
    const org = mem?.[0]?.org_id;
    if (!org) return;
    setOrgId(org);

    const { data: trips } = await supabase.from('trips')
      .select('*').eq('org_id', org).gte('start_date', new Date().toISOString().slice(0,10))
      .order('start_date', { ascending: true }).limit(5);
    setUpcoming(trips || []);

    const { count: c } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('org_id', org);
    setCount(c || 0);
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <h2>Dashboard</h2>
      <div style={{ display:'flex', gap:16 }}>
        <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
          <div>Total Trips</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{count}</div>
        </div>
      </div>
      <div>
        <h3>Upcoming trips</h3>
        <ul>
          {upcoming.map(t=>(
            <li key={t.id}>
              <Link href={`/trips/${t.id}`}>{t.title}</Link>
              {' — '}{t.start_date} → {t.end_date} · {t.location_city || ''}{t.location_city && t.location_country ? ', ' : ''}{t.location_country || ''}
            </li>
          ))}
          {upcoming.length===0 && <li>No upcoming trips.</li>}
        </ul>
      </div>
    </div>
  );
}
