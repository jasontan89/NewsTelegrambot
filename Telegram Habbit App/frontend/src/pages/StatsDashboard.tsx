import React, { useEffect, useState } from 'react';
import BottomNavBar from '../components/BottomNavBar';

export default function StatsDashboard({ user, supabase }: { user: any, supabase: any }) {
  const [habits, setHabits] = useState<any[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats calculation
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [monthlyCompletionRate, setMonthlyCompletionRate] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const { data: habitsData } = await supabase
          .from('hs_habits')
          .select('*')
          .eq('user_id', user.id);
        
        setHabits(habitsData || []);
        if (habitsData && habitsData.length > 0) {
          setSelectedHabitId(habitsData[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [user.id, supabase]);

  useEffect(() => {
    if (!selectedHabitId) return;

    async function loadLogs() {
      setLoading(true);
      try {
        // Query last 30 days logs for selected habit
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: logsData } = await supabase
          .from('hs_habit_logs')
          .select('*')
          .eq('habit_id', selectedHabitId)
          .gte('log_date', thirtyDaysAgoStr)
          .order('log_date', { ascending: false });

        setLogs(logsData || []);

        // Calculate Streaks
        const activeHabit = habits.find(h => h.id === selectedHabitId);
        if (!activeHabit) return;

        const isCompleted = (log: any) => {
          if (!log) return false;
          if (activeHabit.habit_type === 'boolean') return !!log.completed;
          if (activeHabit.habit_type === 'quantitative') return log.value >= activeHabit.target_value;
          if (activeHabit.habit_type === 'time_window') return !!(log.start_time && log.end_time);
          return false;
        };

        // Create set of completed local dates
        const completedDates = new Set<string>();
        logsData?.forEach(log => {
          if (isCompleted(log)) {
            completedDates.add(log.log_date);
          }
        });

        // Compute current streak
        let current = 0;
        let checkDate = new Date();
        // check today
        let checkDateStr = checkDate.toISOString().split('T')[0];
        let hasToday = completedDates.has(checkDateStr);
        
        // If not completed today, check if it was completed yesterday to maintain the streak
        if (!hasToday) {
          checkDate.setDate(checkDate.getDate() - 1);
          checkDateStr = checkDate.toISOString().split('T')[0];
        }

        while (completedDates.has(checkDateStr)) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
          checkDateStr = checkDate.toISOString().split('T')[0];
        }

        // Compute longest streak (over the 30 day window)
        let longest = 0;
        let tempStreak = 0;
        let d = new Date(thirtyDaysAgo);
        for (let i = 0; i <= 30; i++) {
          const dStr = d.toISOString().split('T')[0];
          if (completedDates.has(dStr)) {
            tempStreak++;
            longest = Math.max(longest, tempStreak);
          } else {
            tempStreak = 0;
          }
          d.setDate(d.getDate() + 1);
        }

        setStreak({ current, longest });

        // Monthly completion rate
        const completionRate = logsData ? Math.round((completedDates.size / 30) * 100) : 0;
        setMonthlyCompletionRate(completionRate);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [selectedHabitId, habits, supabase]);

  const activeHabit = habits.find(h => h.id === selectedHabitId);

  // Heatmap helper: generate array of last 28 days (4 weeks)
  const heatmapCells = [];
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - 27); // 4 weeks ago

  for (let i = 0; i < 28; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const log = logs.find(l => l.log_date === dStr);
    
    let lvl = 0;
    if (log) {
      if (activeHabit?.habit_type === 'boolean' && log.completed) lvl = 5;
      else if (activeHabit?.habit_type === 'quantitative' && log.value) {
        const ratio = log.value / (activeHabit.target_value || 1);
        lvl = Math.min(Math.ceil(ratio * 5), 5);
      } else if (activeHabit?.habit_type === 'time_window' && log.start_time) lvl = 5;
    }
    heatmapCells.push({ date: dStr, lvl });
  }

  // Group cells by week for the CSS Grid Column flow
  const weeks = [];
  for (let i = 0; i < heatmapCells.length; i += 7) {
    weeks.push(heatmapCells.slice(i, i + 7));
  }

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-dark flex items-center justify-between px-container-margin h-14">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Habit Stack</h1>
        </div>
        <div>
          <span className="material-symbols-outlined text-on-surface-variant hover:opacity-80 active:scale-95 transition-transform cursor-pointer">account_circle</span>
        </div>
      </header>

      <main className="pt-20 px-container-margin pb-[100px] flex flex-col gap-stack-gap max-w-[390px] mx-auto min-h-screen">
        <section>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1">
            {habits.map(h => (
              <button
                key={h.id}
                onClick={() => {
                  setSelectedHabitId(h.id);
                  if ((window as any).Telegram?.WebApp?.HapticFeedback) {
                    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
                  }
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-full font-label-caps text-label-caps flex items-center gap-2 touch-target-min transition-colors ${
                  selectedHabitId === h.id
                    ? 'bg-surface-container-highest border border-fitness text-fitness'
                    : 'bg-surface border border-border-dark text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${h.color === 'fitness' ? 'bg-fitness' : h.color === 'sleep' ? 'bg-sleep' : h.color === 'nutrition' ? 'bg-nutrition' : h.color === 'supplement' ? 'bg-supplement' : 'bg-primary'}`}></span>
                {h.name}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="text-center text-on-surface-variant py-8">Loading stats...</div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-element-gap">
              <div className="bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-1 justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">Current Streak</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-stat-lg text-stat-lg text-fitness">{streak.current}</span>
                  <span className="font-body-sm text-body-sm text-outline">days</span>
                </div>
              </div>
              <div className="bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-1 justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">Longest Streak</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-stat-lg text-stat-lg text-on-surface">{streak.longest}</span>
                  <span className="font-body-sm text-body-sm text-outline">days</span>
                </div>
              </div>
            </section>

            <section className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="font-headline-md text-headline-md text-on-surface">Activity Map</h2>
                <div className="bg-surface-container rounded-lg p-1 flex">
                  <button className="px-3 py-1 rounded text-on-surface bg-surface-container-highest font-label-caps text-label-caps shadow-sm">Month</button>
                </div>
              </div>

              <div className="overflow-x-auto hide-scrollbar -mx-2 px-2 pb-2">
                <div className="flex gap-2">
                  <div className="grid grid-rows-7 gap-1 font-mono-data text-mono-data text-outline text-xs pr-2 text-right">
                    <span>Mon</span>
                    <span></span>
                    <span>Wed</span>
                    <span></span>
                    <span>Fri</span>
                    <span></span>
                    <span>Sun</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} className="grid grid-rows-7 gap-1">
                        {week.map((cell, cIdx) => (
                          <div
                            key={cIdx}
                            className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                              cell.lvl === 0 ? 'bg-surface-container' : 
                              cell.lvl === 1 ? 'bg-fitness/20' :
                              cell.lvl === 2 ? 'bg-fitness/40' :
                              cell.lvl === 3 ? 'bg-fitness/60' :
                              cell.lvl === 4 ? 'bg-fitness/80' : 'bg-fitness'
                            }`}
                            title={cell.date}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 mt-2 border-t border-border-dark pt-4">
                <span className="font-mono-data text-mono-data text-outline text-xs">Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-surface-container"></div>
                  <div className="w-3 h-3 rounded-sm bg-fitness/20"></div>
                  <div className="w-3 h-3 rounded-sm bg-fitness/40"></div>
                  <div className="w-3 h-3 rounded-sm bg-fitness/60"></div>
                  <div className="w-3 h-3 rounded-sm bg-fitness/80"></div>
                  <div className="w-3 h-3 rounded-sm bg-fitness"></div>
                </div>
                <span className="font-mono-data text-mono-data text-outline text-xs">More</span>
              </div>
            </section>

            <section className="bg-surface-dark border border-border-dark rounded-xl p-4 flex items-start gap-4 mb-8">
              <span className="material-symbols-outlined text-fitness mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
              <div>
                <h3 className="font-body-base text-body-base font-medium text-on-surface">Consistency is Key</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Your average completion rate for '{activeHabit?.name}' this month is {monthlyCompletionRate}%. Keep up the good work!
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNavBar />
    </>
  );
}
