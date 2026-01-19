import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Emergency = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [medicalProfile, setMedicalProfile] = useState(null);
  const [medications, setMedications] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactType, setNewContactType] = useState('Family');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [newMedicalProfile, setNewMedicalProfile] = useState({
    name: '',
    age: '',
    bloodType: '',
    emergencyId: '',
    conditions: [],
    allergies: []
  });
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: ''
  });
  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [currentLocation, setCurrentLocation] = useState('Getting location...');
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleEmergency = async (type = 'general') => {
    setEmergencyActive(true);
    
    try {
      // Firebase emergency trigger
      const { database } = await import('../firebase/config');
      const { ref, set } = await import('firebase/database');
      await set(ref(database, 'EMERGENCY'), {
        panic: true,
        type: type,
        timestamp: Date.now()
      });
      
      // Turn on all lights
      await Promise.all([
        set(ref(database, 'LED1'), 1),
        set(ref(database, 'LED2'), 1),
        set(ref(database, 'LED3'), 1),
        set(ref(database, 'LED4'), 1)
      ]);
      
      // Backend API call with email
      await api.post('/emergency/trigger', {
        type: type,
        location: 'Current Location',
        timestamp: new Date().toISOString(),
        email: 'abhishekgiri1978@gmail.com'
      });
      
      // Vibration
      navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 200]);
      
      // Voice feedback
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`${type} emergency alert activated. All lights turned on. Contacting emergency contacts.`);
        utterance.rate = 1.1;
        utterance.volume = 1;
        speechSynthesis.speak(utterance);
      }
      
      console.log(`🚨 EMERGENCY: ${type} alert activated`);
    } catch (error) {
      console.error('Emergency alert error:', error);
    }
    
    setTimeout(() => setEmergencyActive(false), 5000);
  };
  
  const addContact = () => {
    if (newContactName && newContactPhone) {
      const newContact = {
        id: Date.now(),
        name: newContactName,
        type: newContactType,
        phone: newContactPhone,
        priority: contacts.length + 1
      };
      setContacts([...contacts, newContact]);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactType('Family');
      setShowAddForm(false);
    } else {
      setShowAddForm(true);
    }
  };
  
  const testAlert = async () => {
    try {
      await api.post('/emergency/test-alert');
      
      // Voice feedback
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Test alert sent to all emergency contacts');
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
      
      // Vibration
      navigator.vibrate && navigator.vibrate([100, 50, 100]);
      
      console.log('📧 Test alert sent to all contacts');
    } catch (error) {
      console.error('Test alert error:', error);
    }
  };
  
  const loadMedicalData = async () => {
    if (!user) return;
    // Using localStorage for now since Firestore isn't configured
    const savedProfile = localStorage.getItem(`medicalProfile_${user.id}`);
    if (savedProfile) {
      setMedicalProfile(JSON.parse(savedProfile));
    }
    
    const savedMedications = localStorage.getItem(`medications_${user.id}`);
    if (savedMedications) {
      setMedications(JSON.parse(savedMedications));
    }
  };

  const saveMedicalProfile = async () => {
    if (!user) return;
    
    localStorage.setItem(`medicalProfile_${user.id}`, JSON.stringify(newMedicalProfile));
    setMedicalProfile(newMedicalProfile);
    setShowMedicalForm(false);
    setNewMedicalProfile({
      name: '',
      age: '',
      bloodType: '',
      emergencyId: '',
      conditions: [],
      allergies: []
    });
    if ('speechSynthesis' in window) {
      speechSynthesis.speak(new SpeechSynthesisUtterance('Medical profile saved successfully'));
    }
  };

  const saveMedication = async () => {
    if (!user || !newMedication.name) return;
    
    const newMed = { id: Date.now(), ...newMedication };
    const updatedMedications = [...medications, newMed];
    localStorage.setItem(`medications_${user.id}`, JSON.stringify(updatedMedications));
    setMedications(updatedMedications);
    setShowMedicationForm(false);
    setNewMedication({ name: '', dosage: '', frequency: '', time: '' });
    if ('speechSynthesis' in window) {
      speechSynthesis.speak(new SpeechSynthesisUtterance('Medication reminder added'));
    }
  };

  const deleteMedication = async (medicationId) => {
    if (!user) return;
    
    const updatedMedications = medications.filter(med => med.id !== medicationId);
    localStorage.setItem(`medications_${user.id}`, JSON.stringify(updatedMedications));
    setMedications(updatedMedications);
    if ('speechSynthesis' in window) {
      speechSynthesis.speak(new SpeechSynthesisUtterance('Medication removed'));
    }
  };

  const addCondition = () => {
    if (conditionInput.trim()) {
      setNewMedicalProfile({
        ...newMedicalProfile,
        conditions: [...newMedicalProfile.conditions, conditionInput.trim()]
      });
      setConditionInput('');
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim()) {
      setNewMedicalProfile({
        ...newMedicalProfile,
        allergies: [...newMedicalProfile.allergies, allergyInput.trim()]
      });
      setAllergyInput('');
    }
  };

  const removeCondition = (index) => {
    setNewMedicalProfile({
      ...newMedicalProfile,
      conditions: newMedicalProfile.conditions.filter((_, i) => i !== index)
    });
  };

  const removeAllergy = (index) => {
    setNewMedicalProfile({
      ...newMedicalProfile,
      allergies: newMedicalProfile.allergies.filter((_, i) => i !== index)
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Use reverse geocoding to get address
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            const address = `${data.locality || data.city || ''}, ${data.principalSubdivision || data.countryName || ''}`;
            setCurrentLocation(address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } catch (error) {
            // Fallback to coordinates if geocoding fails
            setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        },
        (error) => {
          setCurrentLocation('Location access denied');
        }
      );
    } else {
      setCurrentLocation('Geolocation not supported');
    }
  };

  useEffect(() => {
    loadMedicalData();
    getCurrentLocation();
  }, [user]);

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
            onClick={() => {
              handleEmergency('911');
              window.location.href = 'tel:+91817176637';
            }}
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
          </div>
        </div>
        
        {showAddForm && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 mb-4">
            <h4 className="text-gray-800 font-medium mb-3">Add New Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Contact Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <select
                value={newContactType}
                onChange={(e) => setNewContactType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="Family">Family</option>
                <option value="Doctor">Doctor</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={addContact}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all"
              >
                Save Contact
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {contacts.length > 0 ? contacts.map((contact) => (
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
                  <button 
                    onClick={() => {
                      window.location.href = `tel:${contact.phone}`;
                      if ('speechSynthesis' in window) {
                        speechSynthesis.cancel();
                        speechSynthesis.speak(new SpeechSynthesisUtterance(`Calling ${contact.name}`));
                      }
                    }}
                    className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm border border-green-300 flex items-center space-x-1 hover:bg-green-200 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>
                    <span>Call</span>
                  </button>
                  <button 
                    onClick={() => {
                      window.location.href = `sms:${contact.phone}`;
                      if ('speechSynthesis' in window) {
                        speechSynthesis.cancel();
                        speechSynthesis.speak(new SpeechSynthesisUtterance(`Sending message to ${contact.name}`));
                      }
                    }}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-300 flex items-center space-x-1 hover:bg-blue-200 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18"/></svg>
                    <span>Text</span>
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No emergency contacts added yet</p>
              <p className="text-gray-400 text-sm">Click 'Add Contact' to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Medical Information */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>Medical Alert</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMedicalForm(true)}
              className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 px-4 py-2 rounded-xl border border-blue-400/30 hover:bg-blue-500/30 transition-all"
            >
              {medicalProfile ? 'Edit Medical Info' : 'Set Medical Info'}
            </button>
            {medicalProfile && (
              <button
                onClick={() => {
                  localStorage.removeItem(`medicalProfile_${user.id}`);
                  setMedicalProfile(null);
                  if ('speechSynthesis' in window) {
                    speechSynthesis.speak(new SpeechSynthesisUtterance('Medical profile deleted'));
                  }
                }}
                className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 px-4 py-2 rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-all"
              >
                Delete
              </button>
            )}
          </div>
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
            <span>Medication Reminders</span>
          </h3>
          <button
            onClick={() => setShowMedicationForm(true)}
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
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => deleteMedication(med.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                      </svg>
                    </button>
                  </div>
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
        <h3 className="text-2xl font-bold text-white mb-6">Location Services</h3>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-medium">Share Location in Emergency</p>
              <p className="text-white/60 text-sm">Automatically share your location with emergency contacts</p>
            </div>
            <div 
              className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer transition-all ${
                locationEnabled ? 'bg-green-500 justify-end' : 'bg-gray-500 justify-start'
              }`}
              onClick={() => setLocationEnabled(!locationEnabled)}
            >
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="text-sm text-white/70">
            <p>Current Location: {currentLocation}</p>
            <button 
              onClick={getCurrentLocation}
              className="text-blue-400 hover:text-blue-300 mt-1"
            >
              Refresh Location
            </button>
          </div>
        </div>
      </div>

      {/* Medical Profile Form Modal */}
      {showMedicalForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Medical Profile</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newMedicalProfile.name}
                  onChange={(e) => setNewMedicalProfile({...newMedicalProfile, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Age"
                  value={newMedicalProfile.age}
                  onChange={(e) => setNewMedicalProfile({...newMedicalProfile, age: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={newMedicalProfile.bloodType}
                  onChange={(e) => setNewMedicalProfile({...newMedicalProfile, bloodType: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                <input
                  type="text"
                  placeholder="Emergency ID (optional)"
                  value={newMedicalProfile.emergencyId}
                  onChange={(e) => setNewMedicalProfile({...newMedicalProfile, emergencyId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add condition"
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addCondition}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newMedicalProfile.conditions.map((condition, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                      <span>{condition}</span>
                      <button onClick={() => removeCondition(index)} className="text-blue-600 hover:text-blue-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add allergy"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addAllergy}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newMedicalProfile.allergies.map((allergy, index) => (
                    <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                      <span>{allergy}</span>
                      <button onClick={() => removeAllergy(index)} className="text-red-600 hover:text-red-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={saveMedicalProfile}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all"
              >
                Save Profile
              </button>
              <button
                onClick={() => setShowMedicalForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Form Modal */}
      {showMedicationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Medication</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Medication Name"
                value={newMedication.name}
                onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Dosage (e.g., 1 tablet, 5ml)"
                value={newMedication.dosage}
                onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={newMedication.frequency}
                onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Frequency</option>
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Four times daily">Four times daily</option>
                <option value="As needed">As needed</option>
                <option value="Weekly">Weekly</option>
              </select>
              <input
                type="time"
                value={newMedication.time}
                onChange={(e) => setNewMedication({...newMedication, time: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={saveMedication}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-all"
              >
                Add Medication
              </button>
              <button
                onClick={() => setShowMedicationForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Emergency;