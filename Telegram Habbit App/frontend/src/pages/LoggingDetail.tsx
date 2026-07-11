import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTodayData, toggleHabitLog, updateQuantitativeLog, updateTimeWindowLog } from '../lib/api';

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getColorClasses(color: string) {
  switch(color) {
    case 'fitness': return { text: 'text-fitness', bg: 'bg-fitness', border: 'border-fitness', bg10: 'bg-fitness/10' };
    case 'supplement': return { text: 'text-supplement', bg: 'bg-supplement', border: 'border-supplement', bg10: 'bg-supplement/10' };
    case 'sleep': return { text: 'text-sleep', bg: 'bg-sleep', border: 'border-sleep', bg10: 'bg-sleep/10' };
    case 'nutrition': return { text: 'text-nutrition', bg: 'bg-nutrition', border: 'border-nutrition', bg10: 'bg-nutrition/10' };
    case 'primary': return { text: 'text-primary', bg: 'bg-primary', border: 'border-primary', bg10: 'bg-primary/10' };
    default: return { text: 'text-primary', bg: 'bg-primary', border: 'border-primary', bg10: 'bg-primary/10' };
  }
}

function formatTimestamptzToTimeStr(ts: string | null | undefined, defaultVal: string): string {
  if (!ts) return defaultVal;
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return defaultVal;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return defaultVal;
  }
}

export default function LoggingDetail({ user, supabase }: { user: any, supabase: any }) {
  const { stackId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ stacks: any[], logs: any[] }>({ stacks: [], logs: [] });
  const [loading, setLoading] = useState(true);
  
  const todayStr = getLocalDateString(new Date());

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchTodayData(supabase, user.id, todayStr);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id, supabase, todayStr]);

  const stack = data.stacks.find(s => s.id === stackId);
  const habits = stack?.hs_stack_habits.map((sh: any) => sh.hs_habits) || [];

  const handleToggle = async (habitId: string, currentStatus: boolean) => {
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) newLogs[logIndex].completed = !currentStatus;
    else newLogs.push({ habit_id: habitId, log_date: todayStr, completed: !currentStatus });
    setData({ ...data, logs: newLogs });

    try {
      await toggleHabitLog(supabase, user.id, habitId, todayStr, !currentStatus);
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    } catch (err) {}
  };

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const handleUpdateQuantitative = async (habitId: string, value: number) => {
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) newLogs[logIndex].value = value;
    else newLogs.push({ habit_id: habitId, log_date: todayStr, value: value });
    setData({ ...data, logs: newLogs });

    try {
      await updateQuantitativeLog(supabase, user.id, habitId, todayStr, value);
    } catch (err) {}
  };

  const handleUpdateTimeWindow = async (habitId: string, startTimeStr: string, endTimeStr: string) => {
    const startIso = new Date(`${todayStr}T${startTimeStr}:00`).toISOString();
    const endIso = new Date(`${todayStr}T${endTimeStr}:00`).toISOString();

    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) {
      newLogs[logIndex].start_time = startIso;
      newLogs[logIndex].end_time = endIso;
    } else {
      newLogs.push({ habit_id: habitId, log_date: todayStr, start_time: startIso, end_time: endIso });
    }
    setData({ ...data, logs: newLogs });

    try {
      await updateTimeWindowLog(supabase, user.id, habitId, todayStr, startIso, endIso);
      triggerHaptic('light');
    } catch (err) {}
  };

  const handleToggleTimeWindow = async (habitId: string, currentStatus: boolean) => {
    triggerHaptic('medium');
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);

    if (currentStatus) {
      if (logIndex > -1) {
        newLogs[logIndex].start_time = null;
        newLogs[logIndex].end_time = null;
      }
      setData({ ...data, logs: newLogs });
      
      try {
        await supabase.from('hs_habit_logs').upsert({
          user_id: user.id,
          habit_id: habitId,
          log_date: todayStr,
          start_time: null,
          end_time: null,
          logged_via: 'app'
        }, { onConflict: 'habit_id, log_date' });
      } catch (e) {}
    } else {
      const defaultStart = '21:30';
      const defaultEnd = '22:30';
      const startIso = new Date(`${todayStr}T${defaultStart}:00`).toISOString();
      const endIso = new Date(`${todayStr}T${defaultEnd}:00`).toISOString();

      if (logIndex > -1) {
        newLogs[logIndex].start_time = startIso;
        newLogs[logIndex].end_time = endIso;
      } else {
        newLogs.push({ habit_id: habitId, log_date: todayStr, start_time: startIso, end_time: endIso });
      }
      setData({ ...data, logs: newLogs });

      try {
        await updateTimeWindowLog(supabase, user.id, habitId, todayStr, startIso, endIso);
      } catch (e) {}
    }
  };

  const handleUpdateNote = async (habitId: string, note: string) => {
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) newLogs[logIndex].note = note;
    else newLogs.push({ habit_id: habitId, log_date: todayStr, note: note });
    setData({ ...data, logs: newLogs });

    try {
      await supabase.from('hs_habit_logs').upsert({
        user_id: user.id,
        habit_id: habitId,
        log_date: todayStr,
        note: note,
        logged_via: 'app'
      }, { onConflict: 'habit_id, log_date' });
    } catch (err) {}
  };

  const progress = useMemo(() => {
    if (!habits.length) return 0;
    let completed = 0;
    habits.forEach((habit: any) => {
      const log = data.logs.find(l => l.habit_id === habit.id);
      if (habit.habit_type === 'boolean' && log?.completed) completed++;
      if (habit.habit_type === 'quantitative' && log?.value >= habit.target_value) completed++;
      if (habit.habit_type === 'time_window' && log?.start_time && log?.end_time) completed++;
    });
    return Math.round((completed / habits.length) * 100);
  }, [data, habits]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!stack) return <div className="p-4">Stack not found.</div>;

  return (
    <div className="bg-background-dark text-on-surface font-body-base antialiased min-h-screen pb-telegram-bottom-safe flex flex-col">
      <header className="fixed top-0 w-full z-50 bg-background-dark/80 backdrop-blur-md border-b border-border-dark">
        <div className="flex items-center justify-between px-container-margin h-14 w-full">
          <button aria-label="Back" onClick={() => navigate(-1)} className="text-primary-fixed-dim hover:opacity-80 active:scale-95 transition-transform flex items-center justify-center w-[44px] h-[44px] -ml-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary-fixed-dim tracking-tight">{stack.name}</h1>
          <div className="w-[44px]"></div>
        </div>
      </header>

      <main className="flex-1 mt-14 px-container-margin pt-6 pb-8 space-y-stack-gap overflow-y-auto hide-scrollbar">
        <div className="space-y-1">
          <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          <div className="flex items-center justify-between">
            <h2 className="font-stat-lg text-stat-lg text-on-surface">Log Habits</h2>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-surface-dark stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
                <path className="text-primary-fixed-dim stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${progress}, 100`} strokeLinecap="round" strokeWidth="3"></path>
              </svg>
              <span className="absolute font-mono-data text-[10px] font-semibold text-primary-fixed-dim">{progress}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-element-gap">
          {habits.map((habit: any) => {
            const log = data.logs.find(l => l.habit_id === habit.id);
            const c = getColorClasses(habit.color);
            
            if (habit.habit_type === 'boolean') {
              const isCompleted = !!log?.completed;
              return (
                <div key={habit.id} className={`bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-3 transition-colors duration-300 ${isCompleted ? c.bg10 : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${c.bg} flex-shrink-0`}></div>
                      <h3 className="font-headline-md text-body-base font-semibold text-on-surface">{habit.name}</h3>
                    </div>
                    <div className="flex items-center justify-center min-w-touch-target-min min-h-touch-target-min">
                      <input 
                        type="checkbox" 
                        checked={isCompleted}
                        onChange={() => handleToggle(habit.id, isCompleted)}
                        className={`w-7 h-7 rounded border-2 border-outline-variant bg-transparent ${c.text} focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all duration-200`}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-border-dark/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-outline">notes</span>
                    <input 
                      type="text" 
                      placeholder="Add reflection or note..."
                      value={log?.note || ''}
                      onChange={(e) => handleUpdateNote(habit.id, e.target.value)}
                      className="bg-transparent text-xs text-on-surface placeholder-outline-variant focus:outline-none w-full"
                    />
                  </div>
                </div>
              );
            }

            if (habit.habit_type === 'quantitative') {
              const currentValue = log?.value || 0;
              const isCompleted = currentValue >= habit.target_value;
              return (
                <div key={habit.id} className={`bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-3 transition-colors duration-300 ${isCompleted ? c.bg10 : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${c.bg} flex-shrink-0`}></div>
                      <div>
                        <h3 className="font-headline-md text-body-base font-semibold text-on-surface">{habit.name}</h3>
                        <p className="font-body-sm text-body-sm text-outline-variant mt-0.5">Target: {habit.target_value} {habit.unit}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-background-dark/50 rounded-lg p-2 border border-border-dark/50">
                    <button onClick={() => handleUpdateQuantitative(habit.id, Math.max(currentValue - 1, 0))} className="w-10 h-10 flex items-center justify-center text-outline hover:text-on-surface active:scale-95 transition-all bg-surface border border-border-dark rounded-md">
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <div className="flex items-baseline space-x-1">
                      <input 
                        type="number" 
                        className="bg-transparent font-mono-data text-[20px] font-semibold text-on-surface w-16 text-center border-b border-transparent focus:border-primary-fixed-dim focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={currentValue === 0 ? '' : currentValue}
                        placeholder="0"
                        onChange={(e) => handleUpdateQuantitative(habit.id, Number(e.target.value))}
                      />
                      <span className="font-mono-data text-body-sm text-outline">{habit.unit}</span>
                    </div>
                    <button onClick={() => handleUpdateQuantitative(habit.id, Math.min(currentValue + 1, habit.target_value))} className="w-10 h-10 flex items-center justify-center text-outline hover:text-on-surface active:scale-95 transition-all bg-surface border border-border-dark rounded-md">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-border-dark/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-outline">notes</span>
                    <input 
                      type="text" 
                      placeholder="Add reflection or note..."
                      value={log?.note || ''}
                      onChange={(e) => handleUpdateNote(habit.id, e.target.value)}
                      className="bg-transparent text-xs text-on-surface placeholder-outline-variant focus:outline-none w-full"
                    />
                  </div>
                </div>
              );
            }

            if (habit.habit_type === 'time_window') {
              const isLogged = !!(log?.start_time && log?.end_time);
              const startTime = formatTimestamptzToTimeStr(log?.start_time, '21:30');
              const endTime = formatTimestamptzToTimeStr(log?.end_time, '22:30');

              return (
                <div key={habit.id} className={`bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-3 transition-colors duration-300 ${isLogged ? c.bg10 : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${c.bg} flex-shrink-0`}></div>
                      <h3 className="font-headline-md text-body-base font-semibold text-on-surface">{habit.name}</h3>
                    </div>
                    <div className="flex items-center justify-center min-w-touch-target-min min-h-touch-target-min">
                      <input 
                        type="checkbox" 
                        checked={isLogged}
                        onChange={() => handleToggleTimeWindow(habit.id, isLogged)}
                        className={`w-7 h-7 rounded border-2 border-outline-variant bg-transparent ${c.text} focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all duration-200`}
                      />
                    </div>
                  </div>

                  {isLogged && (
                    <div className="grid grid-cols-2 gap-3 mt-1 animate-fade-in">
                      <div className="flex flex-col">
                        <label className="font-label-caps text-[9px] text-outline mb-1 pl-1">START TIME</label>
                        <input 
                          className="bg-background-dark border border-border-dark rounded-lg px-2 py-1.5 font-mono-data text-xs text-on-surface focus:border-primary-fixed-dim focus:ring-0 outline-none w-full h-[38px] text-center" 
                          type="time" 
                          value={startTime}
                          onChange={(e) => handleUpdateTimeWindow(habit.id, e.target.value, endTime)}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="font-label-caps text-[9px] text-outline mb-1 pl-1">END TIME</label>
                        <input 
                          className="bg-background-dark border border-border-dark rounded-lg px-2 py-1.5 font-mono-data text-xs text-on-surface focus:border-primary-fixed-dim focus:ring-0 outline-none w-full h-[38px] text-center" 
                          type="time" 
                          value={endTime}
                          onChange={(e) => handleUpdateTimeWindow(habit.id, startTime, e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border-dark/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-outline">notes</span>
                    <input 
                      type="text" 
                      placeholder="Add reflection or note..."
                      value={log?.note || ''}
                      onChange={(e) => handleUpdateNote(habit.id, e.target.value)}
                      className="bg-transparent text-xs text-on-surface placeholder-outline-variant focus:outline-none w-full"
                    />
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </main>
    </div>
  );
}
