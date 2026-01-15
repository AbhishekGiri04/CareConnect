import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Emergency = () => {
  const navigate = useNavigate();
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [contacts, setContacts] = useState([
    { id: 1, name: 'Dr. Sarah Johnson', type: 'Doctor', phone: '+1-555-0123', priority: 1 },
    { id: 2, name: 'John Smith (Son)', type: 'Family', phone: '+1-555-0456', priority: 2 },
    { id: 3, name: 'Emergency Services', type: 'Emergency', phone: '911', priority: 3 }
  ]);
  const [medicalProfile, setMedicalProfile] = useState(null);
  const [medications, setMedications] = useState([]);

  const handleEmergency = async (type = 'general') => {
    setEmergencyActive(true);
    
    try {
      await api.post('/emergency/trigger', {
        type: type,
        location: 'Current Location',
        timestamp: new Date().toISOString()
      });
      
      navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 200]);
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(`${type} emergency alert activated`));
      }
    } catch (error) {
      console.error('Emergency alert error:', error);
    }
    
    setTimeout(() => setEmergencyActive(false), 5000);
  };
  
  const addContact = () => {
    const newContact = {
      id: Date.now(),
      name: `Contact ${contacts.length + 1}`,
      type: 'Family',
      phone: '+1-555-0000',
      priority: contacts.length + 1
    };
    setContacts([...contacts, newContact]);
  };
  
  const testAlert = async () => {
    try {
      await api.post('/emergency/test-alert');
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance('Test alert sent to all contacts'));
      }
    } catch (error) {
      console.error('Test alert error:', error);
    }
  };
  
  const setMedicalInfo = () => {
    setMedicalProfile({
      name: 'John Doe',
      age: 65,
      bloodType: 'O+',
      conditions: ['Diabetes Type 2', 'High Blood Pressure'],
      allergies: ['Penicillin'],
      emergencyId: '#12345'
    });
  };
  
  const addMedication = () => {
    const newMed = {
      id: Date.now(),
      name: 'New Medication',
      dosage: '1 tablet',
      frequency: 'Daily',
      time: '08:00'
    };
    setMedications([...medications, newMed]);
  };

  return (
    <div className="min-h-screen relative">
      {/* Emergency Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://media.istockphoto.com/id/613554262/vector/sos-sign-with-red-background-paper-font.jpg?s=612x612&w=0&k=20&c=_ANrfbqluQcdlT3yeZTL27fuiDOKPv7JmkTbvLZFdZk=)'
        }}
      >
        <div className="absolute inset-0 bg-black/25"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600/20 to-rose-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Emergency Center</h1>
              <p className="text-white/80">Quick access to emergency services and contacts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-600/60 to-red-700/80 backdrop-blur-xl border border-red-500/50 rounded-3xl p-6 shadow-2xl text-center">
          <div className="text-4xl mb-4">🏥</div>
          <h3 className="text-white font-bold text-xl mb-2">Medical Emergency</h3>
          <button 
            onClick={() => handleEmergency('medical')}
            className="w-full bg-red-500/30 text-white py-3 rounded-xl font-bold hover:bg-red-500/50 transition-all border border-red-400/50"
          >
            ACTIVATE
          </button>
        </div>
        
        <div className="bg-gradient-to-br from-orange-600/60 to-red-600/80 backdrop-blur-xl border border-orange-500/50 rounded-3xl p-6 shadow-2xl text-center">
          <div className="text-4xl mb-4">🚨</div>
          <h3 className="text-white font-bold text-xl mb-2">PANIC BUTTON</h3>
          <button 
            onClick={() => handleEmergency('panic')}
            className={`w-full py-3 rounded-xl font-bold transition-all border ${
              emergencyActive 
                ? 'bg-red-600 text-white animate-pulse border-red-400' 
                : 'bg-orange-500/30 text-white hover:bg-orange-500/50 border-orange-400/50'
            }`}
          >
            {emergencyActive ? 'ACTIVATED' : 'PRESS FOR HELP'}
          </button>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600/60 to-blue-700/80 backdrop-blur-xl border border-blue-500/50 rounded-3xl p-6 shadow-2xl text-center">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="text-white font-bold text-xl mb-2">Call 911</h3>
          <button 
            onClick={() => handleEmergency('911')}
            className="w-full bg-blue-500/30 text-white py-3 rounded-xl font-bold hover:bg-blue-500/50 transition-all border border-blue-400/50"
          >
            CALL NOW
          </button>
        </div>
      </div>
      
      {emergencyActive && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-3xl p-6 mb-8 text-center animate-pulse">
          <p className="text-red-300 font-bold text-xl">🚨 EMERGENCY ALERT ACTIVATED</p>
          <p className="text-red-300/80">Contacting emergency services and contacts...</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button className="glass rounded-2xl p-4 text-center hover:bg-white/10 transition-all">
          <div className="text-3xl mb-2">🚑</div>
          <p className="text-white font-medium text-sm">Medical</p>
        </button>
        <button className="glass rounded-2xl p-4 text-center hover:bg-white/10 transition-all">
          <div className="text-3xl mb-2">🔥</div>
          <p className="text-white font-medium text-sm">Fire</p>
        </button>
        <button className="glass rounded-2xl p-4 text-center hover:bg-white/10 transition-all">
          <div className="text-3xl mb-2">👮</div>
          <p className="text-white font-medium text-sm">Police</p>
        </button>
        <button className="glass rounded-2xl p-4 text-center hover:bg-white/10 transition-all">
          <div className="text-3xl mb-2">🏠</div>
          <p className="text-white font-medium text-sm">Home Security</p>
        </button>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white/95 backdrop-blur-xl border border-gray-300 rounded-3xl p-6 md:p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <span>🆘</span>
            <span>Emergency Contacts</span>
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={addContact}
              className="bg-green-100 text-green-700 px-4 py-2 rounded-xl border border-green-300 hover:bg-green-200 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span>Add Contact</span>
              </div>
            </button>
            <button
              onClick={testAlert}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-300 hover:bg-red-200 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span>Test Alert</span>
              </div>
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    contact.type === 'Doctor' ? 'bg-blue-100' :
                    contact.type === 'Family' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {contact.type === 'Doctor' ? (
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V9H15V11H13V13H11V11H9V9H11V7Z"/></svg>
                    ) : contact.type === 'Family' ? (
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M16,17V19H2V17S2,13 9,13 16,17 16,17M12.5,7.5A3.5,3.5 0 0,1 9,11A3.5,3.5 0 0,1 5.5,7.5A3.5,3.5 0 0,1 9,4A3.5,3.5 0 0,1 12.5,7.5M15.94,13A5.32,5.32 0 0,1 18,17V19H22V17S22,13.37 15.94,13M15,4A3.39,3.39 0 0,0 13.07,4.59A5,5 0 0,1 13.07,10.41A3.39,3.39 0 0,0 15,11A3.5,3.5 0 0,0 18.5,7.5A3.5,3.5 0 0,0 15,4Z"/></svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium">{contact.name}</p>
                    <p className="text-gray-600 text-sm">{contact.type} • Priority {contact.priority}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm border border-green-300 flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>
                    <span>Call</span>
                  </button>
                  <button className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-300 flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18"/></svg>
                    <span>Text</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>💊</span>
            <span>Medical Alert</span>
          </h3>
          <button
            onClick={setMedicalInfo}
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 px-4 py-2 rounded-xl border border-blue-400/30 hover:bg-blue-500/30 transition-all"
          >
            <div className="flex items-center space-x-2">
              <span>Set Medical Info</span>
            </div>
          </button>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-4 border border-white/20 mb-4">
          <h4 className="text-white font-medium mb-2">Quick Medical Info</h4>
          {medicalProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <p className="text-white/80">Name: {medicalProfile.name}</p>
                <p className="text-white/80">Age: {medicalProfile.age}</p>
                <p className="text-white/80">Blood Type: {medicalProfile.bloodType}</p>
                <p className="text-white/80">Emergency ID: {medicalProfile.emergencyId}</p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-white/80">Conditions:</p>
                {medicalProfile.conditions.map((condition, index) => (
                  <p key={index} className="text-white/80">• {condition}</p>
                ))}
                <p className="text-white/80">Allergies: {medicalProfile.allergies.join(', ')}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/60">No medical profile set</p>
          )}
        </div>
      </div>
      
      {/* Medication Reminders */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>💊</span>
            <span>Medication Reminders</span>
          </h3>
          <button
            onClick={addMedication}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 px-4 py-2 rounded-xl border border-green-400/30 hover:bg-green-500/30 transition-all"
          >
            <div className="flex items-center space-x-2">
              <span>Add Medication</span>
            </div>
          </button>
        </div>
        
        {medications.length > 0 ? (
          <div className="space-y-3">
            {medications.map((med) => (
              <div key={med.id} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{med.name}</p>
                    <p className="text-white/60 text-sm">{med.dosage} • {med.frequency} at {med.time}</p>
                  </div>
                  <div className="text-2xl">💊</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60 text-center py-8">No medications added yet</p>
        )}
      </div>

      {/* Location Sharing */}
      <div className="glass rounded-3xl p-6 md:p-8">
        <h3 className="text-2xl font-bold text-white mb-6">📍 Location Services</h3>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-medium">Share Location in Emergency</p>
              <p className="text-white/60 text-sm">Automatically share your location with emergency contacts</p>
            </div>
            <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="text-sm text-white/70">
            <p>Current Location: 123 Main St, City, State 12345</p>
            <p>GPS Accuracy: ±3 meters</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Emergency;