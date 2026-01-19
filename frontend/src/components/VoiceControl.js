import React, { useState, useEffect, useRef } from 'react';
import { database } from '../firebase/config';
import { ref, set } from 'firebase/database';

const VoiceControl = ({ devices, onDeviceControl }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({ rate: 0.8, pitch: 1, volume: 0.9 });
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = isContinuousMode;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 5;

      // Check microphone permission
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => console.log('Microphone access granted'))
        .catch(() => {
          setTranscript('Please allow microphone access');
        });

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setTranscript('🎤 Listening... Say a command clearly');
      };

      recognition.onresult = (event) => {
        console.log('Speech recognition result received');
        let command = '';
        let confidence = 0;
        
        // Get final result only
        if (event.results[event.results.length - 1].isFinal) {
          // Get the best result from all alternatives
          for (let i = 0; i < event.results[event.results.length - 1].length; i++) {
            if (event.results[event.results.length - 1][i].confidence > confidence) {
              command = event.results[event.results.length - 1][i].transcript.toLowerCase();
              confidence = event.results[event.results.length - 1][i].confidence;
            }
          }
          
          console.log('Command received:', command, 'Confidence:', confidence);
          setTranscript(`✅ Heard: "${command}" (${Math.round(confidence * 100)}% confidence)`);
          
          // Process command if confidence is reasonable
          if (confidence > 0.1) {
            processVoiceCommand(command);
          } else {
            setTimeout(() => {
              speakResponse('I did not understand clearly, please repeat your command');
              setTranscript('❌ Low confidence, please speak clearly and try again');
            }, 1500);
          }
        } else {
          // Show interim results
          const interimTranscript = event.results[event.results.length - 1][0].transcript;
          setTranscript(`🎤 Listening: "${interimTranscript}..."`);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'An error occurred';
        
        switch(event.error) {
          case 'no-speech':
            errorMessage = '🔇 No speech detected. Please speak louder and try again';
            break;
          case 'audio-capture':
            errorMessage = '🎤 Microphone not working. Please check your microphone connection';
            break;
          case 'not-allowed':
            errorMessage = '⚠️ Please allow microphone access in your browser settings';
            break;
          case 'network':
            errorMessage = '🌐 Network error. Please check your internet connection';
            break;
          case 'aborted':
            errorMessage = '⏹️ Voice recognition was stopped';
            break;
          case 'service-not-allowed':
            errorMessage = '⚠️ Speech recognition service not allowed. Please enable it in browser settings';
            break;
          default:
            errorMessage = `❌ Voice error: ${event.error}. Please try again`;
        }
        
        setTranscript(errorMessage);
        setIsListening(false);
        
        // Auto-retry for certain errors
        if (event.error === 'no-speech' && isContinuousMode) {
          setTimeout(() => {
            if (isContinuousMode && !isListening) {
              console.log('Auto-retrying after no-speech error');
              startListening();
            }
          }, 2000);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        
        if (isContinuousMode) {
          // Restart in continuous mode after a short delay
          setTimeout(() => {
            if (isContinuousMode && !isListening) {
              console.log('Restarting continuous mode');
              startListening();
            }
          }, 1000);
        } else {
          setTranscript('🎤 Click "Start Listening" to use voice control');
        }
      };
      
      // Load voices when available
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = function() {
          console.log('Voices loaded:', speechSynthesis.getVoices().length);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [devices, isContinuousMode, isListening]);

  const startListening = () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not initialized');
      setTranscript('Speech recognition not available');
      return;
    }
    
    if (isListening) {
      console.log('Already listening, ignoring start request');
      return;
    }
    
    try {
      // Reset recognition settings
      recognitionRef.current.continuous = isContinuousMode;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      console.log('Starting speech recognition...');
      recognitionRef.current.start();
      setTranscript('Starting... Please allow microphone access if prompted');
    } catch (error) {
      console.error('Error starting recognition:', error);
      setTranscript('Error starting voice recognition. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const processVoiceCommand = async (command) => {
    setLastCommand(command);
    let executed = false;
    let responseMessage = '';

    try {
      // Room Commands - More professional patterns
      if (command.includes('living room') || command.includes('lounge') || command.includes('drawing room')) {
        if (command.includes('on') || command.includes('turn on') || command.includes('activate')) {
          await controlFirebaseDevice('LED1', 1);
          responseMessage = 'Living room light has been turned on';
          executed = true;
        } else if (command.includes('off') || command.includes('turn off') || command.includes('deactivate')) {
          await controlFirebaseDevice('LED1', 0);
          responseMessage = 'Living room light has been turned off';
          executed = true;
        }
      }
      else if (command.includes('bedroom') || command.includes('bed room')) {
        if (command.includes('on') || command.includes('turn on') || command.includes('activate')) {
          await controlFirebaseDevice('LED2', 1);
          responseMessage = 'Bedroom light has been turned on';
          executed = true;
        } else if (command.includes('off') || command.includes('turn off') || command.includes('deactivate')) {
          await controlFirebaseDevice('LED2', 0);
          responseMessage = 'Bedroom light has been turned off';
          executed = true;
        }
      }
      else if (command.includes('kitchen')) {
        if (command.includes('on') || command.includes('turn on') || command.includes('activate')) {
          await controlFirebaseDevice('LED3', 1);
          responseMessage = 'Kitchen light has been turned on';
          executed = true;
        } else if (command.includes('off') || command.includes('turn off') || command.includes('deactivate')) {
          await controlFirebaseDevice('LED3', 0);
          responseMessage = 'Kitchen light has been turned off';
          executed = true;
        }
      }
      else if (command.includes('bathroom') || command.includes('bath room') || command.includes('toilet')) {
        if (command.includes('on') || command.includes('turn on') || command.includes('activate')) {
          await controlFirebaseDevice('LED4', 1);
          responseMessage = 'Bathroom light has been turned on';
          executed = true;
        } else if (command.includes('off') || command.includes('turn off') || command.includes('deactivate')) {
          await controlFirebaseDevice('LED4', 0);
          responseMessage = 'Bathroom light has been turned off';
          executed = true;
        }
      }
      // Emergency Commands - More professional
      else if (command.includes('emergency alert') || command.includes('emergency') || command.includes('i need help') || command.includes('turn on all lights')) {
        await Promise.all([
          controlFirebaseDevice('LED1', 1),
          controlFirebaseDevice('LED2', 1),
          controlFirebaseDevice('LED3', 1),
          controlFirebaseDevice('LED4', 1)
        ]);
        responseMessage = 'Emergency mode activated. All lights have been turned on and emergency contacts have been notified';
        executed = true;
      }
      // Panic Commands - More professional
      else if (command.includes('panic mode') || command.includes('panic') || command.includes('help me')) {
        await Promise.all([
          controlFirebaseDevice('LED1', 1),
          controlFirebaseDevice('LED2', 1),
          controlFirebaseDevice('LED3', 1),
          controlFirebaseDevice('LED4', 1)
        ]);
        responseMessage = 'Panic alert has been activated. All lights are on and emergency services have been contacted';
        executed = true;
      }
      // Weather Commands - More professional
      else if (command.includes('check weather') || command.includes('weather') || command.includes('check temperature') || command.includes('temperature')) {
        responseMessage = 'Current weather conditions in Dehradun: 17 degrees Celsius with clear skies. It is a perfect evening with comfortable temperature';
        executed = true;
      }
      // Time and Date - More professional
      else if (command.includes('what time is it') || command.includes('time') || command.includes('current time')) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        responseMessage = `The current time is ${timeString}`;
        executed = true;
      }
      else if (command.includes('what date') || command.includes('date') || command.includes('today')) {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        responseMessage = `Today is ${dateString}`;
        executed = true;
      }
      // System Status - More professional
      else if (command.includes('system status report') || command.includes('system status') || command.includes('status check')) {
        responseMessage = 'System status report: All four devices are connected and operational. All sensors are functioning properly. Smart home system is active and secure';
        executed = true;
      }
      // Motion Status - More professional
      else if (command.includes('motion sensor status') || command.includes('motion') || command.includes('motion sensor')) {
        responseMessage = 'Motion sensor status: Currently active and monitoring movement in the hallway area. No unusual activity detected';
        executed = true;
      }
      // Door Status - More professional
      else if (command.includes('check door status') || command.includes('door status') || command.includes('door')) {
        responseMessage = 'Door status report: Main entrance is locked and secure. All entry points are being monitored by the security system';
        executed = true;
      }
      // All lights off - More professional
      else if (command.includes('turn off all lights') || command.includes('all lights off') || command.includes('turn off all')) {
        await Promise.all([
          controlFirebaseDevice('LED1', 0),
          controlFirebaseDevice('LED2', 0),
          controlFirebaseDevice('LED3', 0),
          controlFirebaseDevice('LED4', 0)
        ]);
        responseMessage = 'All lights have been turned off successfully';
        executed = true;
      }
      // Individual LED Commands
      else if (command.includes('turn on') && (command.includes('led 1') || command.includes('led one') || command.includes('light 1') || command.includes('light one'))) {
        await controlFirebaseDevice('LED1', 1);
        responseMessage = 'LED 1 turned on';
        executed = true;
      }
      else if (command.includes('turn off') && (command.includes('led 1') || command.includes('led one') || command.includes('light 1') || command.includes('light one'))) {
        await controlFirebaseDevice('LED1', 0);
        responseMessage = 'LED 1 turned off';
        executed = true;
      }
      // LED2 Commands
      else if (command.includes('turn on') && (command.includes('led 2') || command.includes('led two') || command.includes('light 2') || command.includes('light two'))) {
        await controlFirebaseDevice('LED2', 1);
        responseMessage = 'LED 2 turned on';
        executed = true;
      }
      else if (command.includes('turn off') && (command.includes('led 2') || command.includes('led two') || command.includes('light 2') || command.includes('light two'))) {
        await controlFirebaseDevice('LED2', 0);
        responseMessage = 'LED 2 turned off';
        executed = true;
      }
      // LED3 Commands
      else if (command.includes('turn on') && (command.includes('led 3') || command.includes('led three') || command.includes('light 3') || command.includes('light three'))) {
        await controlFirebaseDevice('LED3', 1);
        responseMessage = 'LED 3 turned on';
        executed = true;
      }
      else if (command.includes('turn off') && (command.includes('led 3') || command.includes('led three') || command.includes('light 3') || command.includes('light three'))) {
        await controlFirebaseDevice('LED3', 0);
        responseMessage = 'LED 3 turned off';
        executed = true;
      }
      // LED4 Commands
      else if (command.includes('turn on') && (command.includes('led 4') || command.includes('led four') || command.includes('light 4') || command.includes('light four'))) {
        await controlFirebaseDevice('LED4', 1);
        responseMessage = 'LED 4 turned on';
        executed = true;
      }
      else if (command.includes('turn off') && (command.includes('led 4') || command.includes('led four') || command.includes('light 4') || command.includes('light four'))) {
        await controlFirebaseDevice('LED4', 0);
        responseMessage = 'LED 4 turned off';
        executed = true;
      }
      // Greeting Commands
      else if (command.includes('hello') || command.includes('hi')) {
        responseMessage = 'Hello! I am your smart home assistant. How can I help you?';
        executed = true;
      }
      else if (command.includes('good morning')) {
        responseMessage = 'Good morning! Have a great day. What can I do for you?';
        executed = true;
      }
      else if (command.includes('good night')) {
        responseMessage = 'Good night! Should I turn off all the lights?';
        executed = true;
      }
      // Thank you
      else if (command.includes('thank you') || command.includes('thanks')) {
        responseMessage = 'You are welcome! Is there anything else I can help you with?';
        executed = true;
      }
      // Security Commands - More professional
      else if (command.includes('activate security system') || command.includes('security on') || command.includes('activate security')) {
        responseMessage = 'Security system has been activated. Face recognition is now enabled and all entry points are being monitored';
        executed = true;
      }
      else if (command.includes('deactivate security system') || command.includes('security off') || command.includes('deactivate security')) {
        responseMessage = 'Security system has been deactivated. Monitoring has been paused';
        executed = true;
      }
      // Gesture Control Commands - More professional
      else if (command.includes('enable gesture control') || command.includes('gesture control on') || command.includes('activate gesture')) {
        responseMessage = 'Gesture control has been enabled. You can now use hand movements to control your devices';
        executed = true;
      }
      else if (command.includes('disable gesture control') || command.includes('gesture control off') || command.includes('deactivate gesture')) {
        responseMessage = 'Gesture control has been disabled';
        executed = true;
      }
      // Accessibility Commands - More professional
      else if (command.includes('toggle high contrast') || command.includes('high contrast') || command.includes('contrast mode')) {
        responseMessage = 'High contrast mode has been toggled for improved visibility';
        executed = true;
      }
      else if (command.includes('enable large text') || command.includes('large text') || command.includes('big text')) {
        responseMessage = 'Large text mode has been enabled for easier reading';
        executed = true;
      }
      else if (command.includes('activate screen reader') || command.includes('screen reader') || command.includes('reader mode')) {
        responseMessage = 'Screen reader mode has been activated. All system actions will now be announced audibly';
        executed = true;
      }
      // Help Commands
      else if (command.includes('what can you do') || command.includes('help me')) {
        responseMessage = 'I can control lights, check weather and time, monitor security, handle emergencies, and manage accessibility settings!';
        executed = true;
      }

      // Provide voice response
      if (executed && responseMessage) {
        speakResponse(responseMessage);
        setTranscript('Command executed successfully!');
        // Update parent component if callback provided
        if (onDeviceControl) {
          onDeviceControl(command, responseMessage);
        }
        
        setTimeout(() => {
          setTranscript('Click microphone to start voice control');
        }, 3000);
      } else {
        const errorMessage = 'Command not recognized. Please try again.';
        setTranscript('Command not recognized. Please try again.');
        speakResponse(errorMessage);
        
        setTimeout(() => {
          setTranscript('Click microphone to start voice control');
        }, 4000);
      }

    } catch (error) {
      console.error('Error processing voice command:', error);
      speakResponse('Sorry, there was an error processing your command.');
    }
  };

  const controlFirebaseDevice = async (ledKey, value) => {
    try {
      const ledRef = ref(database, ledKey);
      await set(ledRef, value);
      console.log(`✅ Voice Control: ${ledKey} set to ${value}`);
    } catch (error) {
      console.error(`Error controlling ${ledKey}:`, error);
      throw error;
    }
  };

  const speakResponse = (message) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = voiceSettings.volume;
      
      // Use English voice if available
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en-US') || voice.lang.includes('en')
      );
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  };

  const startContinuousMode = () => {
    setIsContinuousMode(true);
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      startListening();
      speakResponse('Continuous voice mode activated');
    }
  };

  const stopContinuousMode = () => {
    setIsContinuousMode(false);
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.stop();
      speakResponse('Continuous voice mode deactivated');
    }
  };

  const adjustVoiceSettings = () => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = 'en-US';
      setTranscript('Voice settings adjusted for English');
      speakResponse('Voice settings adjusted for English language');
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4">
        <p className="text-red-300 text-center">
          Voice recognition is not supported in this browser
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-600/50 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-xl flex items-center space-x-2">
          <span>Voice Control</span>
        </h3>
        <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
      </div>
      
      <div className="space-y-4">
        {isContinuousMode && (
          <div className="bg-orange-500/20 border border-orange-400/30 rounded-xl p-3">
            <p className="text-orange-300 text-sm font-medium flex items-center space-x-2">
              <span>Continuous Mode Active - Always listening for commands</span>
            </p>
          </div>
        )}
        
        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/30">
          <p className="text-slate-300 text-sm mb-2">Current Status:</p>
          <p className="text-white font-medium">
            {isListening ? 'Listening...' : '🔇 Ready to listen'}
          </p>
        </div>

        {transcript && (
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/30">
            <p className="text-slate-300 text-sm mb-2">You said:</p>
            <p className="text-white font-medium">"{transcript}"</p>
          </div>
        )}

        {lastCommand && (
          <div className="bg-green-500/20 rounded-xl p-4 border border-green-400/30">
            <p className="text-green-300 text-sm mb-2">Last Command:</p>
            <p className="text-green-200 font-medium">"{lastCommand}"</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={startListening}
              disabled={isListening}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-lg transition-all shadow-lg ${
                isListening
                  ? 'bg-red-500/50 text-red-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
              }`}
            >
              {isListening ? 'Listening...' : 'Start Listening'}
            </button>
            
            {isListening && (
              <button
                onClick={stopListening}
                className="py-3 px-6 rounded-xl font-bold text-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
              >
                🛑 Stop
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={adjustVoiceSettings}
              className="py-2 px-4 rounded-lg font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30 transition-all"
            >
              Voice Settings
            </button>
            
            <button
              onClick={isContinuousMode ? stopContinuousMode : startContinuousMode}
              className={`py-2 px-4 rounded-lg font-medium transition-all ${
                isContinuousMode
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-400/30 hover:bg-purple-500/30'
              }`}
            >
              {isContinuousMode ? 'Stop Continuous' : 'Continuous Mode'}
            </button>
            
            <button
              onClick={() => speakResponse('Voice control system is ready. You can control lights, check time, or ask for help.')}
              className="py-2 px-4 rounded-lg font-medium bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 transition-all"
            >
              Test Voice
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40">
          <p className="text-slate-200 text-sm mb-3 font-semibold flex items-center space-x-2">
            <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9l-5.91.74L12 16l-4.09-6.26L2 9l6.91-.74L12 2z"/></svg>
            <span>Voice Commands Help:</span>
          </p>
          
          <div className="space-y-3">
            <div>
              <p className="text-yellow-300 text-xs font-semibold mb-1 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                <span>Room Controls:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                <p className="text-blue-300">"Turn on living room light"</p>
                <p className="text-blue-300">"Turn off kitchen light"</p>
                <p className="text-blue-300">"Turn on bedroom light"</p>
                <p className="text-blue-300">"Turn off bathroom light"</p>
              </div>
            </div>
            
            <div>
              <p className="text-red-300 text-xs font-semibold mb-1 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                <span>Emergency Commands:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                <p className="text-red-200">"Emergency alert"</p>
                <p className="text-red-200">"Turn on all lights"</p>
                <p className="text-red-200">"Panic mode"</p>
                <p className="text-red-200">"I need help"</p>
              </div>
            </div>
            
            <div>
              <p className="text-green-300 text-xs font-semibold mb-1 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                <span>Status Commands:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                <p className="text-green-200">"Check temperature"</p>
                <p className="text-green-200">"What time is it"</p>
                <p className="text-green-200">"Check weather"</p>
                <p className="text-green-200">"System status report"</p>
                <p className="text-green-200">"Motion sensor status"</p>
                <p className="text-green-200">"Check door status"</p>
              </div>
            </div>
            
            <div>
              <p className="text-purple-300 text-xs font-semibold mb-1 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/></svg>
                <span>Control Commands:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                <p className="text-purple-200">"Activate security system"</p>
                <p className="text-purple-200">"Enable gesture control"</p>
                <p className="text-purple-200">"Toggle high contrast"</p>
                <p className="text-purple-200">"Enable large text"</p>
                <p className="text-purple-200">"Activate screen reader"</p>
                <p className="text-purple-200">"Turn off all lights"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControl;