import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TopNavbar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>, label: 'Home' },
    { path: '/devices', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>, label: 'Devices' },
    { path: '/gesture', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"/></svg>, label: 'Gesture' },
    { path: '/alerts', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>, label: 'Alerts' },
    { path: '/communication', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>, label: 'Communication' },
    { path: '/security', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11C15.4,11 16,11.4 16,12V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V12C8,11.4 8.4,11 9,11V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9.2 10.2,10V11H13.8V10C13.8,9.2 12.8,8.2 12,8.2Z"/></svg>, label: 'Security' },
    { path: '/emergency', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L15.09 8.26L23 9L15.09 9.74L12 17L8.91 9.74L1 9L8.91 8.26L12 1Z"/><circle cx="12" cy="12" r="3"/><path d="M12 19C15.87 19 19 15.87 19 12C19 8.13 15.87 5 12 5C8.13 5 5 8.13 5 12C5 15.87 8.13 19 12 19Z" fill="none" stroke="currentColor" strokeWidth="2"/></svg>, label: 'SOS' },
  ];

  if (location.pathname === '/') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20 backdrop-blur-xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-500/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 group">
            <img 
              src="https://downloadr2.apkmirror.com/wp-content/uploads/2024/03/57/65e2e97c7454c_com.midea.ai.overseas.png" 
              alt="SmartAssist Logo" 
              className="w-10 h-10 rounded-xl transform group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-white font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CareConnect</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  location.pathname === item.path
                    ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white shadow-lg border border-white/20'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } group`}
              >
                <span className={`transition-transform duration-300 group-hover:scale-110 ${
                  location.pathname === item.path ? 'animate-pulse' : ''
                }`}>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>

              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;