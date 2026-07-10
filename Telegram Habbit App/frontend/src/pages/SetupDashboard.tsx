import React, { useEffect, useState } from 'react';
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

interface Reminder {
  id?: string;
  send_at: string;
  days: string[];
  active: boolean;
}

export default function SetupDashboard({ user, supabase }: { user: any, supabase: any }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [reminder, setReminder] = useState<Reminder>({
    send_at: '08:00:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    active: false
  });
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'fitness',
    habit_type: 'boolean',
    unit: '',
    target_value: '',
    color: 'fitness',
    stack_id: ''
  });

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

      // Fetch global reminders
      const { data: reminderData } = await supabase
        .from('hs_reminders')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (reminderData && reminderData.length > 0) {
        let parsedDays: string[] = [];
        try {
          parsedDays = typeof reminderData[0].days === 'string' 
            ? JSON.parse(reminderData[0].days) 
            : reminderData[0].days || [];
        } catch(e) {
          parsedDays = reminderData[0].days || [];
        }

        setReminder({
          id: reminderData[0].id,
          send_at: reminderData[0].send_at,
          days: parsedDays,
          active: reminderData[0].active
        });
      }
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
  const handleToggleReminder = async () => {
    triggerHaptic('medium');
    const nextActive = !reminder.active;
    const nextReminder = { ...reminder, active: nextActive };
    setReminder(nextReminder);

    await supabase.from('hs_reminders').upsert({
      ...(reminder.id ? { id: reminder.id } : {}),
      user_id: user.id,
      send_at: reminder.send_at,
      days: JSON.stringify(reminder.days),
      active: nextActive
    });
  };

  const handleDayToggle = async (day: string) => {
    triggerHaptic('light');
    let nextDays = [...reminder.days];
    if (nextDays.includes(day)) {
      nextDays = nextDays.filter(d => d !== day);
    } else {
      nextDays.push(day);
    }

    const nextReminder = { ...reminder, days: nextDays };
    setReminder(nextReminder);

    await supabase.from('hs_reminders').upsert({
      ...(reminder.id ? { id: reminder.id } : {}),
      user_id: user.id,
      send_at: reminder.send_at,
      days: JSON.stringify(nextDays),
      active: reminder.active
    });
  };

  const handleTimeChange = async (time: string) => {
    triggerHaptic('light');
    const sendAt = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    const nextReminder = { ...reminder, send_at: sendAt };
    setReminder(nextReminder);

    await supabase.from('hs_reminders').upsert({
      ...(reminder.id ? { id: reminder.id } : {}),
      user_id: user.id,
      send_at: sendAt,
      days: JSON.stringify(reminder.days),
      active: reminder.active
    });
  };

  // Habit edits & archiving
  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingHabit(null);
    setFormData({
      name: '',
      category: 'fitness',
      habit_type: 'boolean',
      unit: '',
      target_value: '',
      color: 'fitness',
      stack_id: stacks[0]?.id || ''
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
  const formattedTime = reminder.send_at.split(':').slice(0, 2).join(':');

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

        {/* Global Reminders Settings */}
        <section className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-on-surface">
              <span className={`material-symbols-outlined ${reminder.active ? 'text-primary' : 'text-outline'}`} style={{ fontVariationSettings: reminder.active ? "'FILL' 1" : "'FILL' 0" }}>notifications_active</span>
              <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">Global Reminders</h3>
            </div>
            <div 
              onClick={handleToggleReminder}
              className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${reminder.active ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-background-dark shadow-sm transition-all duration-200 ${reminder.active ? 'right-1' : 'left-1'}`}></div>
            </div>
          </div>

          <div className="flex flex-col items-center py-2 relative">
            {isEditingTime ? (
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={formattedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="bg-surface border border-border-dark rounded-lg px-3 py-2 font-mono-data text-body-base text-on-surface focus:border-primary focus:ring-0 outline-none h-11 text-center"
                />
                <button 
                  onClick={() => setIsEditingTime(false)}
                  className="px-3 py-2 bg-primary text-background-dark font-semibold text-xs rounded-lg active:scale-95 transition-transform"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="font-stat-hero text-stat-hero text-on-surface flex items-baseline gap-1">
                  <span>{formattedTime}</span>
                </div>
                <span 
                  onClick={() => setIsEditingTime(true)}
                  className="font-body-sm text-body-sm text-primary cursor-pointer hover:underline mt-1"
                >
                  Edit Time
                </span>
              </div>
            )}
          </div>

          {/* Weekdays Toggle */}
          <div className="flex justify-between items-center w-full mt-1">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
              const isActive = reminder.days.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono-data text-[12px] font-semibold transition-all duration-200 ${isActive ? 'bg-primary text-background-dark scale-105 shadow' : 'bg-surface text-outline hover:bg-surface-bright'}`}
                >
                  {day[0].toUpperCase()}
                </button>
              );
            })}
          </div>
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
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-[10px] text-outline pl-1">NAME</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Magnesium"
                  className="bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 outline-none w-full h-11"
                  required
                />
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

      <BottomNavBar />
    </>
  );
}
