import React, { useEffect, useState } from 'react';
import BottomNavBar from '../components/BottomNavBar';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ChartsDashboard({ user, supabase }: { user: any, supabase: any }) {
  const [habits, setHabits] = useState<any[]>([]);
  const [var1, setVar1] = useState<string>('');
  const [var2, setVar2] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [correlation, setCorrelation] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: habitsData } = await supabase
          .from('hs_habits')
          .select('*')
          .eq('user_id', user.id);
        
        setHabits(habitsData || []);
        if (habitsData && habitsData.length >= 2) {
          setVar1(habitsData.find(h => h.category === 'sleep')?.id || habitsData[0].id);
          setVar2(habitsData.find(h => h.category === 'fitness')?.id || habitsData[1].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [user.id, supabase]);

  useEffect(() => {
    if (!var1 || !var2) return;

    async function loadChartData() {
      setLoading(true);
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Fetch logs for both variables
        const { data: logsData } = await supabase
          .from('hs_habit_logs')
          .select('*')
          .in('habit_id', [var1, var2])
          .gte('log_date', thirtyDaysAgoStr);

        const h1 = habits.find(h => h.id === var1);
        const h2 = habits.find(h => h.id === var2);

        // Generate date map
        const dataMap: { [date: string]: { date: string, val1: number, val2: number } } = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date(thirtyDaysAgo);
          d.setDate(d.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          
          // format label
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          dataMap[dStr] = {
            date: label,
            val1: 0,
            val2: 0
          };
        }

        const getValue = (log: any, habit: any) => {
          if (!log) return 0;
          if (habit.habit_type === 'boolean') return log.completed ? 100 : 0;
          if (habit.habit_type === 'quantitative') return Number(log.value) || 0;
          if (habit.habit_type === 'time_window') return log.start_time ? 100 : 0;
          return 0;
        };

        logsData?.forEach((log: any) => {
          if (dataMap[log.log_date]) {
            if (log.habit_id === var1) {
              dataMap[log.log_date].val1 = getValue(log, h1);
            } else if (log.habit_id === var2) {
              dataMap[log.log_date].val2 = getValue(log, h2);
            }
          }
        });

        const formatted = Object.values(dataMap);
        setChartData(formatted);

        // Calculate Pearson correlation coefficient
        const n = formatted.length;
        if (n === 0) return;
        const x = formatted.map(d => d.val1);
        const y = formatted.map(d => d.val2);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, val, idx) => sum + val * y[idx], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        const r = den === 0 ? 0 : num / den;
        setCorrelation(Math.round(r * 100) / 100);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadChartData();
  }, [var1, var2, habits, supabase]);

  const h1 = habits.find(h => h.id === var1);
  const h2 = habits.find(h => h.id === var2);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-dark flex items-center justify-between px-container-margin h-14">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Habit Stack</h1>
        </div>
      </header>

      <main className="pt-20 px-container-margin pb-[100px] flex flex-col gap-stack-gap max-w-[390px] mx-auto min-h-screen">
        <section className="flex flex-col gap-2">
          <h2 className="font-stat-hero text-stat-hero text-on-surface">Correlation</h2>
          <p className="font-body-base text-body-base text-on-surface-variant text-sm">Discover relationships between your habits.</p>
        </section>

        <section className="flex flex-col gap-element-gap">
          <div className="flex flex-col gap-3">
            <div className="flex-1 relative">
              <label className="font-label-caps text-label-caps text-outline-variant block mb-1 uppercase text-xs" htmlFor="var1">Variable 1 (Y-Axis L)</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-surface-dark border border-border-dark rounded-lg py-3 px-4 font-body-base text-body-base text-on-surface focus:outline-none focus:border-primary transition-colors h-[44px]"
                  id="var1"
                  value={var1}
                  onChange={(e) => setVar1(e.target.value)}
                >
                  {habits.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="flex-1 relative">
              <label className="font-label-caps text-label-caps text-outline-variant block mb-1 uppercase text-xs" htmlFor="var2">Variable 2 (Y-Axis R)</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-surface-dark border border-border-dark rounded-lg py-3 px-4 font-body-base text-body-base text-on-surface focus:outline-none focus:border-fitness transition-colors h-[44px]"
                  id="var2"
                  value={var2}
                  onChange={(e) => setVar2(e.target.value)}
                >
                  {habits.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>
        </section>

        {!loading && (
          <>
            <section className="bg-surface-dark border border-border-dark rounded-xl p-5 flex items-start gap-4">
              <div className="bg-surface-container-highest p-2 rounded-full flex-shrink-0">
                <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-headline-md text-headline-md text-on-surface text-sm">
                  {correlation > 0.5 ? 'Strong Positive' : correlation < -0.5 ? 'Strong Negative' : 'Mild'} Correlation (r = {correlation})
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-xs mt-1">
                  We've calculated a Pearson coefficient of {correlation} between <span className="text-sleep font-medium">{h1?.name}</span> and <span className="text-fitness font-medium">{h2?.name}</span>.
                </p>
              </div>
            </section>

            <section className="bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-label-caps text-label-caps text-outline-variant uppercase text-xs">30-Day Trend Comparison</h3>
              </div>
              
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid stroke="#262626" />
                    <XAxis dataKey="date" stroke="#8b90a0" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="left" stroke="#6366F1" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#262626', borderColor: '#414755', borderRadius: '8px' }} labelStyle={{ color: '#e0e2ed', fontFamily: 'Geist' }} />
                    <Area yAxisId="left" type="monotone" dataKey="val1" fill="rgba(99, 102, 241, 0.1)" stroke="#6366F1" strokeWidth={2} name={h1?.name || ''} />
                    <Line yAxisId="right" type="monotone" dataKey="val2" stroke="#10B981" strokeWidth={2} dot={false} name={h2?.name || ''} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNavBar />
    </>
  );
}
