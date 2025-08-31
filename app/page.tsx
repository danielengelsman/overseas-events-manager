'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Home() {
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user); setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Magic link sent! Check your email.');
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return (
      <div>
        <h2>Sign in</h2>
        <form onSubmit={signIn}>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <button type="submit">Send magic link</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p>Signed in as <strong>{user.email}</strong></p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link href="/trips">Go to Trips</Link>
        <Link href="/dashboard">Dashboard</Link>
        <button onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
