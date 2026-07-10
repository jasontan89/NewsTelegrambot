import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Today', icon: 'today', path: '/today' },
    { label: 'Stats', icon: 'calendar_view_month', path: '/stats' },
    { label: 'Charts', icon: 'insights', path: '/charts' },
    { label: 'Insights', icon: 'query_stats', path: '/insights' },
    { label: 'Setup', icon: 'settings', path: '/setup' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-telegram-bottom-safe bg-surface-container/90 dark:bg-surface-container-lowest/90 backdrop-blur-lg border-t border-border-dark flex justify-around items-center h-16 px-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              if ((window as any).Telegram?.WebApp?.HapticFeedback) {
                (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
              }
            }}
            className={`flex flex-col items-center justify-center transition-all duration-150 touch-target-min px-2 ${
              isActive 
                ? 'text-primary dark:text-primary-fixed-dim' 
                : 'text-outline dark:text-outline-variant hover:text-primary-container'
            }`}
          >
            <span 
              className="material-symbols-outlined mb-1" 
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="font-label-caps text-label-caps text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
