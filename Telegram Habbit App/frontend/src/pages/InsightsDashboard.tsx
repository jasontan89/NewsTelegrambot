import { useEffect, useState } from 'react';
import BottomNavBar from '../components/BottomNavBar';

export default function InsightsDashboard({ user, supabase }: { user: any, supabase: any }) {
  const [cohesion, setCohesion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Fetch user's first stack habits
        const { data: stacks } = await supabase
          .from('hs_stacks')
          .select(`
            id,
            hs_stack_habits (
              habit_id
            )
          `)
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!stacks) {
          setCohesion(0);
          return;
        }

        const habitIds = stacks.hs_stack_habits.map((sh: any) => sh.habit_id);
        if (habitIds.length === 0) {
          setCohesion(0);
          return;
        }

        // Fetch logs for these habits in last 30 days
        const { data: logs } = await supabase
          .from('hs_habit_logs')
          .select('*')
          .in('habit_id', habitIds)
          .gte('log_date', thirtyDaysAgoStr);

        // Group logs by date
        const dateLogs: { [date: string]: string[] } = {};
        logs?.forEach((log: any) => {
          if (log.completed || (log.value && log.value > 0)) {
            if (!dateLogs[log.log_date]) dateLogs[log.log_date] = [];
            dateLogs[log.log_date].push(log.habit_id);
          }
        });

        // Compute cohesion days (where count of unique completed habits == stack size)
        let cohesionDays = 0;
        Object.values(dateLogs).forEach((completedHabitIds) => {
          const uniqueCompleted = new Set(completedHabitIds);
          if (uniqueCompleted.size === habitIds.length) {
            cohesionDays++;
          }
        });

        setCohesion(Math.round((cohesionDays / 30) * 100));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id, supabase]);

  const circumference = 314; // 2 * Math.PI * 50
  const strokeDashoffset = circumference - (cohesion / 100) * circumference;

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-dark flex items-center justify-between px-container-margin h-14">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Habit Stack</h1>
        </div>
      </header>

      <main className="pt-20 px-container-margin pb-[100px] flex flex-col gap-stack-gap max-w-[390px] mx-auto min-h-screen">
        {loading ? (
          <div className="text-center text-on-surface-variant py-8">Calculating cohesion...</div>
        ) : (
          <>
            <section className="flex flex-col items-center justify-center pt-4">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle className="stroke-surface-dark" cx="60" cy="60" fill="none" r="50" strokeWidth="8"></circle>
                  <circle 
                    className="stroke-primary transition-all duration-1000 ease-out" 
                    cx="60" cy="60" fill="none" r="50" 
                    strokeLinecap="round" strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  ></circle>
                </svg>
                <div className="text-center z-10 flex flex-col items-center">
                  <span className="font-stat-hero text-stat-hero text-on-surface">{cohesion}<span className="font-stat-lg text-stat-lg">%</span></span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant mt-1 text-[10px]">Stack Cohesion</span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center max-w-xs mt-6 text-xs">
                Percentage of days the full stack was completed together over the last 30 days.
              </p>
            </section>

            <section className="flex flex-col gap-stack-gap mt-4">
              <div className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface text-sm">Consistency Alert</h2>
                </div>
                <p className="font-body-base text-body-base text-on-surface-variant text-xs">
                  Your Morning Stack is typically most vulnerable on weekends when schedules shift. Plan ahead to lock down compliance.
                </p>
              </div>

              <div className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface text-sm">Pattern Found</h2>
                </div>
                <p className="font-body-base text-body-base text-on-surface-variant text-xs">
                  Supplements compliance drops significantly when you log less than 7 hours of sleep. Focus on winding down early!
                </p>
              </div>

              <div className="bg-surface-dark border border-border-dark rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-fitness" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface text-sm">Upward Trend</h2>
                </div>
                <p className="font-body-base text-body-base text-on-surface-variant text-xs">
                  Fitness habits show a strong correlation with Nutrition logging. When one is completed, the other follows 88% of the time.
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
