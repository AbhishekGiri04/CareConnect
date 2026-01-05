import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const socketInstance = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5004', {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    // Device updates
    socketInstance.on('device_update', (data) => {
      console.log('📱 Device update:', data);
      setDeviceStatus(prev => ({ ...prev, [data.deviceId]: data }));
    });

    // MQTT messages
    socketInstance.on('mqtt_message', (data) => {
      console.log('📡 MQTT message:', data);
      if (data.topic.includes('status')) {
        setDeviceStatus(prev => ({ ...prev, [data.deviceId]: data.payload }));
      }
    });

    // Emergency alerts
    socketInstance.on('emergency', (data) => {
      console.log('🚨 Emergency alert:', data);
      setAlerts(prev => [data, ...prev]);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('🚨 Emergency Alert', {
          body: data.message,
          icon: '/favicon.ico'
        });
      }
    });

    // Health alerts
    socketInstance.on('health_alert', (data) => {
      console.log('❤️ Health alert:', data);
      setAlerts(prev => [data, ...prev]);
    });

    // Fall detection
    socketInstance.on('fall_detected', (data) => {
      console.log('🚨 Fall detected:', data);
      setAlerts(prev => [{ ...data, type: 'fall_detection', severity: 'critical' }, ...prev]);
      
      // Audio alert for accessibility
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Fall detected! Emergency services have been notified.');
        speechSynthesis.speak(utterance);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const emitDeviceCommand = (deviceId, command) => {
    if (socket) {
      socket.emit('device_command', { deviceId, command });
    }
  };

  const emitEmergency = (data) => {
    if (socket) {
      socket.emit('emergency_trigger', data);
    }
  };

  const value = {
    socket,
    connected,
    deviceStatus,
    alerts,
    emitDeviceCommand,
    emitEmergency,
    setAlerts
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};