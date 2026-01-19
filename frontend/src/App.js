import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Navbar from './components/Navbar';
import TopNavbar from './components/TopNavbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import DeviceControl from './pages/DeviceControl';
import Alerts from './pages/Alerts';
import GestureControl from './pages/GestureControl';
import CaregiverDashboard from './pages/CaregiverDashboard';
import HealthMonitoring from './pages/HealthMonitoring';
import DeviceSetup from './pages/DeviceSetup';
import Emergency from './pages/Emergency';
import Analytics from './pages/Analytics';
import AccessibilitySettings from './components/AccessibilitySettings';
import HackathonDemo from './components/HackathonDemo';
import BackendController from './pages/BackendController';
import Security from './pages/Security';
import Communication from './pages/Communication';
import './accessibility.css';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      <main className="flex-1">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/devices" element={<DeviceControl />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/gesture" element={<GestureControl />} />
          <Route path="/caregiver" element={<CaregiverDashboard />} />
          <Route path="/health" element={<HealthMonitoring />} />
          <Route path="/setup" element={<DeviceSetup />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<AccessibilitySettings />} />
          <Route path="/demo" element={<HackathonDemo />} />
          <Route path="/controller" element={<BackendController />} />
          <Route path="/security" element={<Security />} />
          <Route path="/communication" element={<Communication />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AccessibilityProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;