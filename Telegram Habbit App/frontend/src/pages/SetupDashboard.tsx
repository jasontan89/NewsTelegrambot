import React, { useEffect, useState, useMemo } from 'react';
import BottomNavBar from '../components/BottomNavBar';
import { seedMockData } from '../lib/api';

interface Habit {
  id: string;
  name: string;
  category: string;
  habit_type: string;
  unit: string | null;
  target_value: number | null;
  color: string;
  archived: boolean;
  stack_association?: string; // stack ID
}

interface Stack {
  id: string;
  name: string;
}

interface StackReminder {
  id?: string;
  stack_id: string;
  stack_name: string;
  send_at: string;
  days: string[];
  active: boolean;
}

export default function SetupDashboard({ user, supabase }: { user: any, supabase: any }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [reminders, setReminders] = useState<StackReminder[]>([]);
  const [isEditingReminderId, setIsEditingReminderId] = useState<string | null>(null);
  const [archivedHabits, setArchivedHabits] = useState<any[]>([]);
  const [restoringHabitId, setRestoringHabitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

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

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'fitness',
    habit_type: 'boolean',
    unit: '',
    target_value: '',
    color: 'fitness',
    stack_id: ''
  });

  const suggestions = useMemo(() => {
    if (!formData.name.trim() || editingHabit) return [];
    const query = formData.name.toLowerCase();
    return archivedHabits.filter((h: any) => h.name.toLowerCase().includes(query));
  }, [formData.name, archivedHabits, editingHabit]);

  const loadData = async () => {
    try {
      setLoading(true);
      await seedMockData(supabase, user.id);

      // Fetch stacks
      const { data: stacksData } = await supabase
        .from('hs_stacks')
        .select('id, name')
        .eq('user_id', user.id)
        .order('sort_order');
      setStacks(stacksData || []);

      // Fetch habits and their stack link
      const { data: habitsData } = await supabase
        .from('hs_habits')
        .select(`
          id, name, category, habit_type, unit, target_value, color, archived,
          hs_stack_habits (
            stack_id
          )
        `)
        .eq('user_id', user.id)
        .eq('archived', false);

      const parsedHabits = (habitsData || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        habit_type: h.habit_type,
        unit: h.unit,
        target_value: h.target_value,
        color: h.color,
        archived: h.archived,
        stack_association: h.hs_stack_habits?.[0]?.stack_id || ''
      }));
      setHabits(parsedHabits);

      // Fetch archived habits
      const { data: archivedData } = await supabase
        .from('hs_habits')
        .select('id, name, category, habit_type, unit, target_value, color')
        .eq('user_id', user.id)
        .eq('archived', true);
      setArchivedHabits(archivedData || []);

      // Fetch reminders for the user
      const { data: reminderData } = await supabase
        .from('hs_reminders')
        .select('*')
        .eq('user_id', user.id);

      const parsedReminders = (stacksData || []).map((stack: any) => {
        const found = reminderData?.find((r: any) => r.stack_id === stack.id);
        let parsedDays: string[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        if (found) {
          try {
            parsedDays = typeof found.days === 'string' ? JSON.parse(found.days) : found.days || [];
          } catch(e) {}
        }
        return {
          id: found?.id,
          stack_id: stack.id,
          stack_name: stack.name,
          send_at: found?.send_at || (stack.name.toLowerCase().includes('morning') ? '12:00:00' : stack.name.toLowerCase().includes('afternoon') ? '18:00:00' : '22:00:00'),
          days: parsedDays,
          active: found?.active ?? false
        };
      });
      setReminders(parsedReminders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id, supabase]);

  // Haptic feedback trigger
  const triggerHaptic = (style: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
      if (style === 'light' || style === 'medium') {
        (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
      } else if (style === 'success' || style === 'warning') {
        (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred(style);
      }
    }
  };

  // Reminder updates
  const handleToggleReminder = async (stackId: string) => {
    triggerHaptic('medium');
    const updated = reminders.map(r => {
      if (r.stack_id === stackId) {
        const nextActive = !r.active;
        
        supabase.from('hs_reminders').upsert({
          ...(r.id ? { id: r.id } : {}),
          user_id: user.id,
          stack_id: r.stack_id,
          send_at: r.send_at,
          days: r.days,
          active: nextActive
        }).then(() => {
          if (!r.id) loadData();
        });

        return { ...r, active: nextActive };
      }
      return r;
    });
    setReminders(updated);
  };

  const handleDayToggle = async (stackId: string, day: string) => {
    triggerHaptic('light');
    const updated = reminders.map(r => {
      if (r.stack_id === stackId) {
        let nextDays = [...r.days];
        if (nextDays.includes(day)) {
          nextDays = nextDays.filter(d => d !== day);
        } else {
          nextDays.push(day);
        }

        supabase.from('hs_reminders').upsert({
          ...(r.id ? { id: r.id } : {}),
          user_id: user.id,
          stack_id: r.stack_id,
          send_at: r.send_at,
          days: nextDays,
          active: r.active
        }).then(() => {
          if (!r.id) loadData();
        });

        return { ...r, days: nextDays };
      }
      return r;
    });
    setReminders(updated);
  };

  const handleTimeChange = async (stackId: string, time: string) => {
    triggerHaptic('light');
    const sendAt = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    const updated = reminders.map(r => {
      if (r.stack_id === stackId) {
        supabase.from('hs_reminders').upsert({
          ...(r.id ? { id: r.id } : {}),
          user_id: user.id,
          stack_id: r.stack_id,
          send_at: sendAt,
          days: r.days,
          active: r.active
        }).then(() => {
          if (!r.id) loadData();
        });

        return { ...r, send_at: sendAt };
      }
      return r;
    });
    setReminders(updated);
  };

  // Habit edits & archiving
  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingHabit(null);
    setRestoringHabitId(null);
    setFormData({
      name: '',
      category: 'fitness',
      habit_type: 'boolean',
      unit: '',
      target_value: '',
      color: 'primary',
      stack_id: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    triggerHaptic('light');
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      category: habit.category,
      habit_type: habit.habit_type,
      unit: habit.unit || '',
      target_value: habit.target_value ? String(habit.target_value) : '',
      color: habit.color,
      stack_id: habit.stack_association || ''
    });
    setIsModalOpen(true);
  };

  const handleArchive = async (habitId: string) => {
    triggerHaptic('warning');
    // Optimistic update
    setHabits(habits.filter(h => h.id !== habitId));
    await supabase.from('hs_habits').update({ archived: true }).eq('id', habitId);
    await loadData(); // refresh archived list as well
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    triggerHaptic('success');
    setLoading(true);

    try {
      const payload: any = {
        user_id: user.id,
        name: formData.name,
        category: formData.category,
        habit_type: formData.habit_type,
        color: formData.color,
        unit: formData.habit_type === 'quantitative' ? formData.unit : null,
        target_value: formData.habit_type === 'quantitative' ? Number(formData.target_value) : null
      };

      let habitId = '';

      if (editingHabit) {
        habitId = editingHabit.id;
        await supabase.from('hs_habits').update(payload).eq('id', habitId);
      } else if (restoringHabitId) {
        habitId = restoringHabitId;
        await supabase.from('hs_habits').update({
          ...payload,
          archived: false
        }).eq('id', habitId);
      } else {
        const { data } = await supabase.from('hs_habits').insert(payload).select().single();
        if (data) habitId = data.id;
      }

      // Sync stack relation
      // First delete current stack relationships for this habit
      await supabase.from('hs_stack_habits').delete().eq('habit_id', habitId);

      // If stack chosen, link it
      if (formData.stack_id) {
        await supabase.from('hs_stack_habits').insert({
          stack_id: formData.stack_id,
          habit_id: habitId,
          sort_order: 99
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fitness': return 'bg-fitness';
      case 'nutrition': return 'bg-nutrition';
      case 'supplement': return 'bg-supplement';
      case 'sleep': return 'bg-sleep';
      default: return 'bg-primary';
    }
  };

  if (loading && habits.length === 0) {
    return <div className="flex items-center justify-center min-h-screen text-on-surface">Loading setup...</div>;
  }

  // Group habits by category
  const categories = ['fitness', 'nutrition', 'supplement', 'sleep'];

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-dark flex items-center justify-between px-container-margin h-14">
        <div className="flex items-center gap-2 text-primary dark:text-primary-fixed-dim">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <span className="font-headline-md text-headline-md font-bold">Habit Stack</span>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright active:scale-95 transition-all text-primary dark:text-primary-fixed-dim"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
      </header>

      <main className="pt-20 px-container-margin pb-[100px] flex flex-col gap-stack-gap max-w-[390px] mx-auto min-h-screen">
        <section className="flex flex-col gap-1 mt-2">
          <h2 className="font-stat-lg text-stat-lg text-on-surface">Setup & Routines</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Configure your habits, stacks, and reminder settings.</p>
        </section>

        {/* Stack Reminders Settings */}
        <section className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
            <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">Stack Reminders</h3>
          </div>

          <div className="flex flex-col gap-5 mt-2">
            {reminders.map((r) => {
              const formattedTime = r.send_at.split(':').slice(0, 2).join(':');
              const isEditing = isEditingReminderId === r.stack_id;

              return (
                <div key={r.stack_id} className="border-b border-border-dark/30 pb-4 last:border-b-0 last:pb-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-body-base text-body-base text-on-surface font-semibold">{r.stack_name}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <input 
                            type="time" 
                            value={formattedTime}
                            onChange={(e) => handleTimeChange(r.stack_id, e.target.value)}
                            className="bg-surface border border-border-dark rounded-lg px-2 py-1 font-mono-data text-xs text-on-surface focus:border-primary focus:ring-0 outline-none h-8 text-center"
                          />
                          <button 
                            onClick={() => setIsEditingReminderId(null)}
                            className="px-2 py-1 bg-primary text-background-dark font-semibold text-[10px] rounded active:scale-95 transition-transform"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsEditingReminderId(r.stack_id)}
                          className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline font-mono-data font-semibold text-left"
                        >
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {formattedTime}
                        </button>
                      )}
                    </div>
                    <div 
                      onClick={() => handleToggleReminder(r.stack_id)}
                      className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${r.active ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-background-dark shadow-sm transition-all duration-200 ${r.active ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-1">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                      const isActive = r.days.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => handleDayToggle(r.stack_id, day)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-mono-data text-[10px] font-semibold transition-all duration-200 ${isActive ? 'bg-primary/20 border border-primary text-primary' : 'bg-surface border border-border-dark text-outline hover:bg-surface-bright'}`}
                        >
                          {day[0].toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Help & Resources Section */}
        <section className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">help_outline</span>
            <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">Help & Resources</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">New to Habit Stack? Read the guide to understand routines, habit types, and Telegram reminders.</p>
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowGuide(true);
              setGuideStep(0);
            }}
            className="w-full bg-surface-variant border border-border-dark text-on-surface font-bold text-sm rounded-lg h-11 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            Open User Guide
          </button>
        </section>

        {/* Habits list by categories */}
        <section className="flex flex-col gap-6">
          {categories.map((cat) => {
            const catHabits = habits.filter(h => h.category === cat);
            return (
              <div key={cat} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 pl-1">
                  <div className={`w-2 h-2 rounded-full ${getCategoryColor(cat)}`}></div>
                  <h4 className="font-label-caps text-label-caps uppercase text-outline tracking-wider">{cat}</h4>
                </div>

                <div className="flex flex-col gap-2">
                  {catHabits.length === 0 ? (
                    <div className="text-outline-variant text-xs py-2 pl-3 italic">No active habits inside {cat}</div>
                  ) : (
                    catHabits.map((habit) => (
                      <div 
                        key={habit.id}
                        className="bg-surface-dark border border-border-dark rounded-xl p-4 flex items-center justify-between hover:bg-surface-container transition-colors group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-body-base text-body-base text-on-surface font-medium">{habit.name}</span>
                          {habit.habit_type === 'quantitative' && (
                            <span className="text-[11px] text-outline">Target: {habit.target_value} {habit.unit}</span>
                          )}
                          {habit.stack_association && (
                            <span className="text-[10px] text-primary/80 font-mono-data">
                              Linked: {stacks.find(s => s.id === habit.stack_association)?.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-outline-variant">
                          <button 
                            onClick={() => handleOpenEdit(habit)}
                            className="w-10 h-10 flex items-center justify-center hover:text-on-surface active:scale-90 transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleArchive(habit.id)}
                            className="w-10 h-10 flex items-center justify-center hover:text-error active:scale-90 transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">archive</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Add / Edit Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
          <div className="w-full max-w-[340px] bg-surface-container border border-border-dark rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {editingHabit ? 'Edit Habit' : 'Add Habit'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 relative">
                <label className="font-label-caps text-[10px] text-outline pl-1">NAME</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Magnesium"
                  className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none w-full h-11"
                  required
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-[60px] left-0 right-0 bg-surface border border-border-dark rounded-lg p-1 max-h-32 overflow-y-auto flex flex-col gap-1 z-[200] shadow-xl">
                    <span className="text-[9px] text-outline pl-2 py-1 uppercase tracking-wider font-semibold">Previously Deleted (Click to Restore)</span>
                    {suggestions.map(h => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          setRestoringHabitId(h.id);
                          setFormData({
                            name: h.name,
                            category: h.category,
                            habit_type: h.habit_type,
                            unit: h.unit || '',
                            target_value: h.target_value ? String(h.target_value) : '',
                            color: h.color || 'primary',
                            stack_id: formData.stack_id
                          });
                        }}
                        className="text-left px-2 py-1.5 rounded hover:bg-surface-variant text-xs text-on-surface flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold">{h.name}</span>
                        <span className="text-[10px] text-primary bg-primary/10 rounded-full px-2 py-0.5 capitalize">{h.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-[10px] text-outline pl-1">CATEGORY</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-background-dark border border-border-dark rounded-lg px-2 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none h-11"
                  >
                    <option value="fitness">Fitness</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="supplement">Supplement</option>
                    <option value="sleep">Sleep/Recovery</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-[10px] text-outline pl-1">COLOR</label>
                  <select 
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="bg-background-dark border border-border-dark rounded-lg px-2 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none h-11"
                  >
                    <option value="primary">Default (Blue)</option>
                    <option value="fitness">Green (Fitness)</option>
                    <option value="nutrition">Orange (Nutrition)</option>
                    <option value="supplement">Purple (Supplement)</option>
                    <option value="sleep">Indigo (Sleep)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-[10px] text-outline pl-1">HABIT TYPE</label>
                <select 
                  value={formData.habit_type}
                  onChange={(e) => setFormData({ ...formData, habit_type: e.target.value })}
                  className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none h-11"
                >
                  <option value="boolean">Boolean Check-off</option>
                  <option value="quantitative">Quantitative Stepper</option>
                  <option value="time_window">Time Window Picker</option>
                </select>
              </div>

              {formData.habit_type === 'quantitative' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-[10px] text-outline pl-1">UNIT</label>
                    <input 
                      type="text" 
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g. mg, L"
                      className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none w-full h-11"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-[10px] text-outline pl-1">TARGET VALUE</label>
                    <input 
                      type="number" 
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      placeholder="e.g. 400"
                      className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none w-full h-11"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-[10px] text-outline pl-1">STACK ROUTINE</label>
                <select 
                  value={formData.stack_id}
                  onChange={(e) => setFormData({ ...formData, stack_id: e.target.value })}
                  className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none h-11"
                >
                  <option value="">None (Standalone)</option>
                  {stacks.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-background-dark font-bold text-sm rounded-lg h-11 mt-2 active:scale-[0.98] transition-all hover:opacity-95"
              >
                {editingHabit ? 'Save Changes' : 'Create Habit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/85 backdrop-blur-md">
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
                    setShowGuide(false);
                  }
                }}
                className="flex-1 bg-primary text-background-dark font-bold text-sm rounded-lg h-11 active:scale-95 transition-all"
              >
                {guideStep === guideSteps.length - 1 ? 'Close Guide' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavBar />
    </>
  );
}
