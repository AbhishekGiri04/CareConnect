import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home', gradient: 'from-blue-500 to-purple-600' },
    { path: '/devices', icon: '💡', label: 'Devices', gradient: 'from-green-500 to-emerald-600' },
    { path: '/gesture', icon: '👆', label: 'Gesture', gradient: 'from-purple-500 to-indigo-600' },
    { path: '/alerts', icon: '🔔', label: 'Alerts', gradient: 'from-red-500 to-pink-600' },
    { path: '/communication', icon: '💬', label: 'Communication', gradient: 'from-cyan-500 to-blue-600' },
    { path: '/security', icon: '🔒', label: 'Security', gradient: 'from-yellow-500 to-orange-600' },
    { path: '/emergency', icon: '🆘', label: 'SOS', gradient: 'from-red-600 to-red-800' },
  ];

  if (location.pathname === '/') return null;

  return (
    <nav className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="glass rounded-3xl px-8 py-4 shadow-2xl border border-white/20">
        <div className="flex space-x-4">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-2 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                location.pathname === item.path
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-110`
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
              }`}
            >
              <span className={`text-2xl transition-transform duration-300 ${
                location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'
              }`}>{item.icon}</span>
              <span className="text-xs font-semibold tracking-wide">{item.label}</span>
              {location.pathname === item.path && (
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;