import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Sprout, Scan, ShoppingBag, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/dashboard',
      icon: Home,
      isActive: location.pathname === '/dashboard' || location.pathname === '/',
      ariaLabel: 'Home',
    },
    {
      id: 'farm',
      label: 'My Farm',
      path: '/farm',
      icon: Sprout,
      isActive: location.pathname.startsWith('/farm') || location.pathname.startsWith('/crops'),
      ariaLabel: 'My Farm',
    },
    {
      id: 'scan',
      label: 'AI Scan',
      path: '/scan',
      icon: Scan,
      isActive: location.pathname.startsWith('/scan'),
      ariaLabel: 'AI Scan',
      isHero: true,
    },
    {
      id: 'market',
      label: 'Market',
      path: '/marketplace',
      icon: ShoppingBag,
      isActive: location.pathname.startsWith('/marketplace') || location.pathname.startsWith('/tracking') || location.pathname.startsWith('/order-success'),
      ariaLabel: 'Market',
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/settings',
      icon: User,
      isActive: location.pathname.startsWith('/settings'),
      ariaLabel: 'Profile',
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-black backdrop-blur-md border-t border-gray-200/90 dark:border-gray-800/90 rounded-t-2xl sm:rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.8)] transition-colors duration-200"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
    >
      <div className="grid grid-cols-5 items-end justify-items-center w-full max-w-lg mx-auto px-1 pt-2 sm:pt-2.5 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-label={item.ariaLabel}
              aria-current={active ? 'page' : undefined}
              className={`group flex flex-col items-center justify-center w-full py-1 px-0.5 rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 text-center ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-600 dark:text-white font-medium hover:text-gray-900 dark:hover:text-emerald-200'
              }`}
            >
              {item.isHero ? (
                <div
                  className={`w-11 h-11 xs:w-12 xs:h-12 rounded-2xl flex items-center justify-center mb-0.5 transition-all duration-200 shadow-sm ${
                    active
                      ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-2 ring-emerald-400/50 scale-105'
                      : 'bg-emerald-500/10 dark:bg-emerald-950/90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <Icon size={28} className="shrink-0" />
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center mb-0.5 transition-transform group-hover:scale-105">
                  <Icon
                    size={28}
                    className={`shrink-0 transition-colors ${
                      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-white'
                    }`}
                  />
                </div>
              )}
              <span className="text-[13px] min-[360px]:text-[14px] min-[400px]:text-[16px] leading-tight tracking-tight truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
