import { useEffect, useState } from 'react'
import { useLaunchParams } from '@telegram-apps/sdk-react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TodayDashboard from './pages/TodayDashboard'
import LoggingDetail from './pages/LoggingDetail'
import StatsDashboard from './pages/StatsDashboard'
import ChartsDashboard from './pages/ChartsDashboard'
import InsightsDashboard from './pages/InsightsDashboard'
import SetupDashboard from './pages/SetupDashboard'

export default function App() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  let lp: any;
  try {
    lp = useLaunchParams();
  } catch (e) {
    console.warn("Not in Telegram environment");
  }

  useEffect(() => {
    if (lp?.themeParams) {
      document.body.style.setProperty('--tg-theme-bg-color', lp.themeParams.bgColor || 'var(--color-background-dark)');
      document.body.style.setProperty('--tg-theme-text-color', lp.themeParams.textColor || 'var(--color-on-background)');
    }
  }, [lp]);

  useEffect(() => {
    async function authenticate() {
      // Fallback initData if the SDK mock fails to provide it
      const fallbackMockInitData = new URLSearchParams({
        user: JSON.stringify({
          id: 123456789,
          first_name: 'Dev',
          username: 'dev_user',
        }),
        auth_date: Math.floor(Date.now() / 1000).toString(),
        hash: 'mock_hash_for_local_testing',
      }).toString();

      const dataToUse = lp?.initDataRaw || import.meta.env.VITE_MOCK_INIT_DATA || fallbackMockInitData;

      if (!dataToUse) {
        setError("No Telegram init data found.");
        return;
      }

      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

        const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-telegram`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ initData: dataToUse })
        });

        if (!res.ok) {
          throw new Error(`Auth failed: ${await res.text()}`);
        }

        const { token, user: dbUser } = await res.json();
        
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });

        setSupabase(client);
        setUser(dbUser);
      } catch (e: any) {
        setError(e.message);
      }
    }

    authenticate();
  }, [lp?.initDataRaw]);

  if (error) {
    return <div style={{ padding: '16px', color: 'var(--color-error)' }}>Error: {error}</div>;
  }

  if (!user || !supabase) {
    return <div style={{ padding: '16px' }}>Authenticating with Telegram...</div>;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="w-full h-full">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayDashboard user={user} setUser={setUser} supabase={supabase} />} />
          <Route path="/log/:stackId" element={<LoggingDetail user={user} supabase={supabase} />} />
          <Route path="/stats" element={<StatsDashboard user={user} supabase={supabase} />} />
          <Route path="/charts" element={<ChartsDashboard user={user} supabase={supabase} />} />
          <Route path="/insights" element={<InsightsDashboard user={user} supabase={supabase} />} />
          <Route path="/setup" element={<SetupDashboard user={user} supabase={supabase} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
