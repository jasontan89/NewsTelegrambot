import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTodayData, toggleHabitLog, seedMockData, updateQuantitativeLog } from '../lib/api';

import BottomNavBar from '../components/BottomNavBar';

// Format date to local YYYY-MM-DD
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

export default function TodayDashboard({ user, setUser, supabase }: { user: any, setUser: any, supabase: any }) {
  const navigate = useNavigate();
  const [data, setData] = useState<{ stacks: any[], logs: any[] }>({ stacks: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  
  const todayStr = getLocalDateString(new Date());

  useEffect(() => {
    if (user && !user.has_seen_guide) {
      setShowGuide(true);
    }
  }, [user]);

  const handleDismissGuide = async () => {
    setShowGuide(false);
    if (user) {
      setUser({ ...user, has_seen_guide: true });
      await supabase.from('hs_users').update({ has_seen_guide: true }).eq('id', user.id);
    }
  };

  const guideSteps = [
    {
      title: "Welcome to Habit Stack! 🚀",
      description: "Habit stacking works by anchoring new behaviors to your existing daily routines. Let's do a quick tour!",
      icon: "rocket_launch"
    },
    {
      title: "1. Stacks & Routines 📅",
      description: "Your day is organized into three default stacks: Morning Stack, Afternoon Stack, and Evening Routine. Perform habits in sequence to make them atomic!",
      icon: "dashboard"
    },
    {
      title: "2. Track Different Types 📊",
      description: "Check off simple habits (Vitamins), increment quantitative counters (Water Intake), or log exact time windows (Digital Sunset).",
      icon: "fact_check"
    },
    {
      title: "3. Streaks & Heatmaps 🔥",
      description: "Complete all habits in a stack to build a perfect daily streak. Visual heatmap cells track your progress consistency over time.",
      icon: "local_fire_department"
    },
    {
      title: "4. Telegram Bot Integration 🤖",
      description: "Chat with our Telegram Bot to log habits instantly on the go (using /log command), check stats, and receive smart, customizable reminders.",
      icon: "robot_2"
    }
  ];

  useEffect(() => {
    async function load() {
      try {
        await seedMockData(supabase, user.id);
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

  const handleToggle = async (habitId: string, currentStatus: boolean) => {
    // Optimistic update
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) {
      newLogs[logIndex].completed = !currentStatus;
    } else {
      newLogs.push({ habit_id: habitId, log_date: todayStr, completed: !currentStatus });
    }
    setData({ ...data, logs: newLogs });

    try {
      await toggleHabitLog(supabase, user.id, habitId, todayStr, !currentStatus);
      // Haptic feedback
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      const revertedLogs = [...data.logs];
      const revIndex = revertedLogs.findIndex(l => l.habit_id === habitId);
      if (revIndex > -1) revertedLogs[revIndex].completed = currentStatus;
      setData({ ...data, logs: revertedLogs });
    }
  };

  const handleIncrement = async (habitId: string, currentValue: number, target: number) => {
    const newValue = Math.min(currentValue + 1, target);
    if (newValue === currentValue) return;

    // Optimistic update
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) newLogs[logIndex].value = newValue;
    else newLogs.push({ habit_id: habitId, log_date: todayStr, value: newValue });
    setData({ ...data, logs: newLogs });

    try {
      await updateQuantitativeLog(supabase, user.id, habitId, todayStr, newValue);
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecrement = async (habitId: string, currentValue: number) => {
    const newValue = Math.max(currentValue - 1, 0);
    if (newValue === currentValue) return;

    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) newLogs[logIndex].value = newValue;
    else newLogs.push({ habit_id: habitId, log_date: todayStr, value: newValue });
    setData({ ...data, logs: newLogs });

    try {
      await updateQuantitativeLog(supabase, user.id, habitId, todayStr, newValue);
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectValueUpdate = async (habitId: string, val: number) => {
    const newValue = Math.max(0, val);
    if (isNaN(newValue)) return;

    // Optimistic update
    const newLogs = [...data.logs];
    const logIndex = newLogs.findIndex(l => l.habit_id === habitId);
    if (logIndex > -1) newLogs[logIndex].value = newValue;
    else newLogs.push({ habit_id: habitId, log_date: todayStr, value: newValue });
    setData({ ...data, logs: newLogs });

    try {
      await updateQuantitativeLog(supabase, user.id, habitId, todayStr, newValue);
      if ((window as any).Telegram?.WebApp?.HapticFeedback) {
        (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate completion percentage
  const progress = useMemo(() => {
    let total = 0;
    let completed = 0;
    
    data.stacks.forEach(stack => {
      stack.hs_stack_habits.forEach((sh: any) => {
        const habit = sh.hs_habits;
        total++;
        const log = data.logs.find(l => l.habit_id === habit.id);
        if (habit.habit_type === 'boolean') {
          if (log?.completed) completed++;
        } else if (habit.habit_type === 'quantitative') {
          if (log?.value >= habit.target_value) completed++;
        } else if (habit.habit_type === 'time_window') {
          if (log?.start_time && log?.end_time) completed++;
        }
      });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [data]);

  const circumference = 339.292; // 2 * Math.PI * 54
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-on-surface">Loading stacks...</div>;
  }

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-dark flex items-center justify-between px-container-margin h-14">
        <div className="flex items-center gap-2 text-primary dark:text-primary-fixed-dim hover:opacity-80 active:scale-95 transition-transform cursor-pointer">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <span className="font-headline-md text-headline-md font-bold">Habit Stack</span>
        </div>
        <div>
          <span className="material-symbols-outlined text-on-surface-variant hover:opacity-80 active:scale-95 transition-transform cursor-pointer">account_circle</span>
        </div>
      </header>

      <main className="pt-20 px-container-margin pb-[100px] flex flex-col gap-stack-gap max-w-[390px] mx-auto min-h-screen">
        <section className="flex flex-col items-center justify-center py-4 relative">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 120 120">
              <circle className="stroke-surface" cx="60" cy="60" fill="none" r="54" strokeWidth="8"></circle>
              <circle 
                className="stroke-primary progress-ring__circle" 
                cx="60" cy="60" fill="none" r="54" 
                strokeDasharray={circumference} 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round" strokeWidth="8"
              ></circle>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-stat-hero text-stat-hero text-on-surface">{progress}%</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase mt-1">Today's Stack</span>
            </div>
          </div>
        </section>

        {data.stacks.map(stack => {
          const habits = stack.hs_stack_habits.map((sh: any) => sh.hs_habits);
          const completedCount = habits.filter((habit: any) => {
            const log = data.logs.find(l => l.habit_id === habit.id);
            if (habit.habit_type === 'boolean') return log?.completed;
            if (habit.habit_type === 'quantitative') return log?.value >= habit.target_value;
            return false;
          }).length;

          return (
            <section key={stack.id} className="bg-surface-dark border border-border-dark rounded-xl p-4 flex flex-col gap-element-gap">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-headline-md text-headline-md text-on-surface">{stack.name}</h2>
                <span className="font-mono-data text-mono-data text-on-surface-variant cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/log/${stack.id}`)}>{completedCount}/{habits.length} <span className="material-symbols-outlined text-[14px] align-middle">chevron_right</span></span>
              </div>

              {habits.map((habit: any) => {
                const log = data.logs.find(l => l.habit_id === habit.id);
                
                const c = getColorClasses(habit.color);
                if (habit.habit_type === 'boolean') {
                  const isCompleted = !!log?.completed;
                  return (
                    <div key={habit.id} className={`flex items-center justify-between p-2 rounded-lg transition-colors min-h-[44px] ${isCompleted ? c.bg10 : 'hover:bg-surface-variant/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${c.bg}`}></div>
                        <span className={`font-body-base text-body-base text-on-surface ${isCompleted ? 'line-through opacity-70' : ''}`}>{habit.name}</span>
                      </div>
                      <div 
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${isCompleted ? `${c.border} ${c.bg}` : 'border-outline-variant hover:border-primary'}`}
                        onClick={() => handleToggle(habit.id, isCompleted)}
                      >
                        {isCompleted && <span className="material-symbols-outlined text-[16px] text-background-dark font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                      </div>
                    </div>
                  );
                }

                if (habit.habit_type === 'quantitative') {
                  const currentValue = log?.value || 0;
                  return (
                    <div key={habit.id} className="flex flex-col gap-element-gap mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${c.bg}`}></div>
                          <h3 className="font-body-base text-body-base text-on-surface">{habit.name}</h3>
                        </div>
                        <span className="font-mono-data text-mono-data text-on-surface-variant">{habit.unit}</span>
                      </div>
                      <div className="flex items-center justify-between bg-surface py-2 px-4 rounded-lg">
                        <button onClick={() => handleDecrement(habit.id, currentValue)} className="w-touch-target-min h-touch-target-min flex items-center justify-center rounded-lg bg-surface-variant text-on-surface hover:bg-surface-container-highest active:scale-95 transition-all">
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                        <div className="flex items-baseline gap-1">
                          <input 
                            type="number" 
                            className="bg-transparent font-stat-lg text-stat-lg text-on-surface w-16 text-center border-b border-transparent focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={currentValue === 0 ? '' : currentValue}
                            placeholder="0"
                            onChange={(e) => handleDirectValueUpdate(habit.id, Number(e.target.value))}
                          />
                          <span className="font-mono-data text-mono-data text-outline-variant">/ {habit.target_value}{habit.unit}</span>
                        </div>
                        <button onClick={() => handleIncrement(habit.id, currentValue, habit.target_value)} className={`w-touch-target-min h-touch-target-min flex items-center justify-center rounded-lg bg-surface-variant hover:bg-surface-container-highest active:scale-95 transition-all ${c.text}`}>
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (habit.habit_type === 'time_window') {
                  return (
                    <div key={habit.id} className="flex items-center justify-between bg-surface border border-border-dark rounded-xl p-3 mt-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${c.bg}`}></div>
                        <div className="flex flex-col">
                          <span className="font-body-base text-body-base text-on-surface">{habit.name}</span>
                        </div>
                      </div>
                      <div className="bg-surface border border-outline-variant/30 rounded-full px-3 py-1 flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/log/${stack.id}`)}>
                         <span className={`font-mono-data text-mono-data ${c.text}`}>Log Time</span>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </section>
          );
        })}
      </main>

      <BottomNavBar />

      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/85 backdrop-blur-sm">
          <div className="w-full max-w-[340px] bg-surface-container border border-border-dark rounded-2xl p-6 flex flex-col items-center text-center gap-5 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-4xl">{guideSteps[guideStep].icon}</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                {guideSteps[guideStep].title}
              </h3>
              <p className="font-body-base text-body-base text-on-surface-variant leading-relaxed">
                {guideSteps[guideStep].description}
              </p>
            </div>

            {/* Pagination dots */}
            <div className="flex gap-1.5 justify-center my-1">
              {guideSteps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === guideStep ? 'bg-primary w-6' : 'bg-outline-variant/40'}`}
                />
              ))}
            </div>

            <div className="flex gap-3 w-full mt-2">
              {guideStep > 0 && (
                <button 
                  onClick={() => setGuideStep(guideStep - 1)}
                  className="flex-1 bg-surface-variant text-on-surface font-bold text-sm rounded-lg h-11 active:scale-95 transition-all border border-border-dark"
                >
                  Back
                </button>
              )}
              <button 
                onClick={() => {
                  if (guideStep < guideSteps.length - 1) {
                    setGuideStep(guideStep + 1);
                  } else {
                    handleDismissGuide();
                  }
                }}
                className="flex-1 bg-primary text-background-dark font-bold text-sm rounded-lg h-11 active:scale-95 transition-all"
              >
                {guideStep === guideSteps.length - 1 ? 'Start Tracking' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
