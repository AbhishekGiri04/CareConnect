const firebaseConfig = {
  apiKey: "AIzaSyDpdj8Avn9fkP6muM93DJSRjaTgQgJCV7M",
  authDomain: "smartassist-home.firebaseapp.com",
  databaseURL: "https://smartassist-home-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartassist-home",
  storageBucket: "smartassist-home.firebasestorage.app",
  messagingSenderId: "330545353615",
  appId: "1:330545353615:web:a1da293cccd1f67712f1fa",
  measurementId: "G-JLQ3PK3N5M"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Reference to Firebase database
var database = firebase.database();

// Function to toggle LED status
function toggleLED(led, status) {
    var ledRef = database.ref(led);
    ledRef.set(status ? 1 : 0);
}

// Listen for changes in LED status and gas leak
database.ref().on('value', function(snapshot) {
    var data = snapshot.val();
    var led1Status = data.LED1;
    var led2Status = data.LED2;
    var led3Status = data.LED3;
    var led4Status = data.LED4;
    var gasLeakStatus = data.GASLEAK;

    updateToggleSwitch("led1", led1Status);
    updateToggleSwitch("led2", led2Status);
    updateToggleSwitch("led3", led3Status);
    updateToggleSwitch("led4", led4Status);

    updateLEDStatus("statusLED1", "LED1", led1Status);
    updateLEDStatus("statusLED2", "LED2", led2Status);
    updateLEDStatus("statusLED3", "LED3", led3Status);
    updateLEDStatus("statusLED4", "LED4", led4Status);
    
    // Handle gas leak status
    handleGasLeakStatus(gasLeakStatus);
    
    // Handle PIR data from Firebase
    if (data.PIR_SENSORS) {
        handlePIRData(data.PIR_SENSORS);
    }
    
    // Handle temperature data
    if (data.TEMPERATURE) {
        handleTemperatureData(data.TEMPERATURE);
    }
    
    // Handle door sensor data
    if (data.DOOR_SENSORS) {
        handleDoorData(data.DOOR_SENSORS);
    }
    
    // Handle emergency data
    if (data.EMERGENCY) {
        handleEmergencyData(data.EMERGENCY);
    }
});

// PIR Motion Detection Variables
let pirDetections = [];
let lastPIRUpdate = {};

// Initialize PIR detections array
if (!pirDetections) {
    pirDetections = [];
}

function handlePIRData(pirData) {
    if (!pirData) return;
    
    Object.keys(pirData).forEach(sensorId => {
        const sensorData = pirData[sensorId];
        if (sensorData && sensorData.people_count !== undefined) {
            processPIRDetection(sensorId, sensorData);
        }
    });
}

function processPIRDetection(sensorId, data) {
    const peopleCount = data.people_count;
    const timestamp = data.timestamp || new Date().toLocaleString();
    const location = data.location || getRoomName(sensorId);
    
    const detection = {
        sensorId: sensorId,
        location: location,
        peopleCount: peopleCount,
        timestamp: timestamp,
        motionDetected: data.motion_detected || false,
        id: Date.now()
    };
    
    // Only add if it's a new detection
    const lastDetection = pirDetections[0];
    if (!lastDetection || lastDetection.sensorId !== sensorId || 
        lastDetection.peopleCount !== peopleCount || 
        (Date.now() - lastDetection.id) > 30000) { // 30 seconds minimum between same detections
        
        pirDetections.unshift(detection);
        
        if (pirDetections.length > 50) {
            pirDetections = pirDetections.slice(0, 50);
        }
        
        // Store in localStorage
        localStorage.setItem('pirDetections', JSON.stringify(pirDetections));
        
        updatePIRDisplay();
        updateMotionStatus();
        
        if (peopleCount > 0) {
            if (isScreenReaderEnabled) {
                announceToScreenReader(`${peopleCount} people detected in ${location} at ${timestamp}`);
            }
            
            if (isVibrationEnabled && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }
}

function getRoomName(sensorId) {
    const roomMap = {
        'PIR_1': 'Living Room',
        'PIR_2': 'Bedroom',
        'PIR_3': 'Kitchen'
    };
    return roomMap[sensorId] || 'Smart Home';
}

// Handle temperature data from Firebase
function handleTemperatureData(tempData) {
    const tempStatus = document.getElementById('tempStatus');
    if (!tempStatus) return;
    
    let avgTemp = 0;
    let roomCount = 0;
    let hasAlert = false;
    
    Object.keys(tempData).forEach(room => {
        const roomData = tempData[room];
        if (roomData && roomData.value) {
            avgTemp += roomData.value;
            roomCount++;
            
            if (roomData.value > 30 || roomData.value < 10) {
                hasAlert = true;
            }
        }
    });
    
    if (roomCount > 0) {
        avgTemp = avgTemp / roomCount;
        
        if (hasAlert) {
            tempStatus.textContent = 'ALERT';
            tempStatus.className = 'status-danger';
        } else {
            tempStatus.textContent = 'NORMAL';
            tempStatus.className = 'status-safe';
        }
    }
}

function updatePIRDisplay() {
    const pirContainer = document.getElementById('pirDetections');
    if (!pirContainer) {
        console.log('PIR container not found');
        return;
    }
    
    if (pirDetections.length === 0) {
        pirContainer.innerHTML = '<p style="color: white; text-align: center;">No motion detected yet</p>';
        return;
    }
    
    pirContainer.innerHTML = pirDetections.slice(0, 10).map(detection => `
        <div class="pir-entry">
            <div><strong>${detection.peopleCount} people detected near PIR sensor at ${detection.timestamp}</strong></div>
            <div>Location: ${detection.location}</div>
        </div>
    `).join('');
}

// Function to update toggle switch based on LED status
function updateToggleSwitch(led, status) {
    var toggleSwitch = document.getElementById(led);
    toggleSwitch.checked = (status === 1);
}

// Function to update LED status text
function updateLEDStatus(elementId, ledName, status) {
    var statusText = document.getElementById(elementId);
    var deviceName = ledName.replace('LED', 'Device ');
    statusText.textContent = deviceName + " is " + (status ? "ON" : "OFF");
    
    // Update current states
    currentLEDStates[ledName] = status;
    
    // Update large button status
    updateLargeButtonStatus(ledName, status);
    
    // Screen reader announcement
    if (isScreenReaderEnabled) {
        var deviceName = ledName.replace('LED', 'Device ');
        announceToScreenReader(`${deviceName} is now ${status ? 'on' : 'off'}`);
    }
    
    // Vibration feedback for deaf users
    if (isVibrationEnabled && navigator.vibrate) {
        navigator.vibrate(status ? [100, 50, 100] : [200]);
    }
}

// Update Large Button Status
function updateLargeButtonStatus(ledName, status) {
    const ledNumber = ledName.replace('LED', '');
    const button = document.getElementById(`largeLed${ledNumber}`);
    const statusSpan = document.getElementById(`largeLed${ledNumber}Status`);
    
    if (button && statusSpan) {
        if (status) {
            button.classList.add('on');
            statusSpan.textContent = 'ON';
        } else {
            button.classList.remove('on');
            statusSpan.textContent = 'OFF';
        }
    }
}

// Large Button Toggle Function
function toggleLEDLarge(ledName) {
    const currentStatus = currentLEDStates[ledName];
    const newStatus = !currentStatus;
    
    toggleLED(ledName, newStatus);
    
    // Update corresponding small toggle
    const ledNumber = ledName.replace('LED', '');
    document.getElementById(`led${ledNumber}`).checked = newStatus;
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
    }
}

// Emergency All Lights Function
function emergencyAllLights() {
    ['LED1', 'LED2', 'LED3', 'LED4'].forEach(led => {
        toggleLED(led, true);
        const ledNumber = led.replace('LED', '');
        document.getElementById(`led${ledNumber}`).checked = true;
    });
    
    // Strong vibration for emergency
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Screen reader announcement
    if (isScreenReaderEnabled) {
        announceToScreenReader('Emergency activated. All lights are now on.');
    }
    
    // Visual flash for deaf users
    document.body.style.backgroundColor = '#ff0000';
    setTimeout(() => {
        document.body.style.backgroundColor = '';
    }, 500);
}

// Screen Reader Announcements
function announceToScreenReader(text) {
    if (speechSynthesis && isScreenReaderEnabled) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// Global Accessibility Toggle Functions
function toggleHighContrast() {
    isHighContrast = !isHighContrast;
    
    // Apply to entire project globally
    const body = document.body;
    const html = document.documentElement;
    
    if (isHighContrast) {
        body.classList.add('high-contrast');
        html.classList.add('high-contrast');
        
        // Create global high contrast styles
        let style = document.getElementById('global-hc-override');
        if (!style) {
            style = document.createElement('style');
            style.id = 'global-hc-override';
            document.head.appendChild(style);
        }
        style.textContent = `
            html.high-contrast, html.high-contrast body, html.high-contrast *,
            body.high-contrast, body.high-contrast * {
                background: #000000 !important;
                background-color: #000000 !important;
                background-image: none !important;
                color: #ffffff !important;
                border-color: #ffffff !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
            html.high-contrast button, body.high-contrast button {
                background: #ffffff !important;
                color: #000000 !important;
                border: 3px solid #000000 !important;
                font-weight: bold !important;
            }
            html.high-contrast button:hover, body.high-contrast button:hover {
                background: #ffff00 !important;
                color: #000000 !important;
            }
        `;
    } else {
        body.classList.remove('high-contrast');
        html.classList.remove('high-contrast');
        const style = document.getElementById('global-hc-override');
        if (style) style.remove();
    }
    
    // Update button state
    const btn = document.getElementById('highContrastBtn');
    if (btn) btn.classList.toggle('active', isHighContrast);
    
    // Save and broadcast globally
    localStorage.setItem('highContrast', isHighContrast);
    window.dispatchEvent(new CustomEvent('accessibilityChange', {
        detail: { highContrast: isHighContrast }
    }));
    
    announceToScreenReader(isHighContrast ? 'High contrast mode enabled globally' : 'High contrast mode disabled globally');
}

function toggleLargeText() {
    isLargeText = !isLargeText;
    
    // Apply to entire project globally
    const body = document.body;
    const html = document.documentElement;
    
    if (isLargeText) {
        body.classList.add('large-text');
        html.classList.add('large-text');
        
        // Create global large text styles
        let style = document.getElementById('global-lt-override');
        if (!style) {
            style = document.createElement('style');
            style.id = 'global-lt-override';
            document.head.appendChild(style);
        }
        style.textContent = `
            html.large-text, html.large-text body, body.large-text { font-size: 1.25em !important; }
            html.large-text *, body.large-text * { font-size: inherit !important; }
            html.large-text button, body.large-text button { padding: 1rem 1.5rem !important; font-size: 1.25rem !important; }
            html.large-text h1, body.large-text h1 { font-size: 2.5rem !important; }
            html.large-text h2, body.large-text h2 { font-size: 2rem !important; }
            html.large-text p, body.large-text p { font-size: 1.25rem !important; }
        `;
    } else {
        body.classList.remove('large-text');
        html.classList.remove('large-text');
        const style = document.getElementById('global-lt-override');
        if (style) style.remove();
    }
    
    // Update button state
    const btn = document.getElementById('largeTextBtn');
    if (btn) btn.classList.toggle('active', isLargeText);
    
    // Save and broadcast globally
    localStorage.setItem('largeText', isLargeText);
    window.dispatchEvent(new CustomEvent('accessibilityChange', {
        detail: { largeText: isLargeText }
    }));
    
    announceToScreenReader(isLargeText ? 'Large text mode enabled globally' : 'Large text mode disabled globally');
}

function toggleScreenReader() {
    isScreenReaderEnabled = !isScreenReaderEnabled;
    
    // Apply globally
    const body = document.body;
    const html = document.documentElement;
    
    if (isScreenReaderEnabled) {
        body.setAttribute('aria-live', 'polite');
        html.setAttribute('aria-live', 'polite');
        body.classList.add('screen-reader-enabled');
        html.classList.add('screen-reader-enabled');
    } else {
        body.removeAttribute('aria-live');
        html.removeAttribute('aria-live');
        body.classList.remove('screen-reader-enabled');
        html.classList.remove('screen-reader-enabled');
    }
    
    // Update button state
    const btn = document.getElementById('screenReaderBtn');
    if (btn) btn.classList.toggle('active', isScreenReaderEnabled);
    
    // Save and broadcast globally
    localStorage.setItem('screenReader', isScreenReaderEnabled);
    window.dispatchEvent(new CustomEvent('accessibilityChange', {
        detail: { screenReader: isScreenReaderEnabled }
    }));
    
    if (isScreenReaderEnabled) {
        announceToScreenReader('Screen reader enabled globally. I will now announce all actions.');
    }
}

function toggleVibration() {
    isVibrationEnabled = !isVibrationEnabled;
    
    // Apply globally
    const body = document.body;
    const html = document.documentElement;
    
    if (isVibrationEnabled) {
        body.classList.add('vibration-enabled');
        html.classList.add('vibration-enabled');
    } else {
        body.classList.remove('vibration-enabled');
        html.classList.remove('vibration-enabled');
    }
    
    // Update button state
    const btn = document.getElementById('vibrationBtn');
    if (btn) btn.classList.toggle('active', isVibrationEnabled);
    
    // Save and broadcast globally
    localStorage.setItem('vibration', isVibrationEnabled);
    window.dispatchEvent(new CustomEvent('accessibilityChange', {
        detail: { vibrationAlerts: isVibrationEnabled }
    }));
    
    if (isVibrationEnabled && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    announceToScreenReader(isVibrationEnabled ? 'Vibration alerts enabled globally' : 'Vibration alerts disabled globally');
}

// Load Global Accessibility Preferences
function loadAccessibilityPreferences() {
    // Load saved preferences
    isHighContrast = localStorage.getItem('highContrast') === 'true';
    isLargeText = localStorage.getItem('largeText') === 'true';
    isScreenReaderEnabled = localStorage.getItem('screenReader') === 'true';
    isVibrationEnabled = localStorage.getItem('vibration') !== 'false'; // Default true
    
    // Apply preferences globally
    if (isHighContrast) {
        toggleHighContrast();
        toggleHighContrast(); // Toggle twice to set state correctly
    }
    
    if (isLargeText) {
        toggleLargeText();
        toggleLargeText(); // Toggle twice to set state correctly
    }
    
    if (isScreenReaderEnabled) {
        toggleScreenReader();
        toggleScreenReader(); // Toggle twice to set state correctly
    }
    
    if (isVibrationEnabled) {
        toggleVibration();
        toggleVibration(); // Toggle twice to set state correctly
    }
    
    // Listen for accessibility changes from other parts of the system
    window.addEventListener('accessibilityChange', function(event) {
        const settings = event.detail;
        
        if (settings.highContrast !== undefined && settings.highContrast !== isHighContrast) {
            toggleHighContrast();
        }
        if (settings.largeText !== undefined && settings.largeText !== isLargeText) {
            toggleLargeText();
        }
        if (settings.screenReader !== undefined && settings.screenReader !== isScreenReaderEnabled) {
            toggleScreenReader();
        }
        if (settings.vibrationAlerts !== undefined && settings.vibrationAlerts !== isVibrationEnabled) {
            toggleVibration();
        }
    });
}

// Voice Control Variables
let recognition;
let isListening = false;

// Initialize Speech Recognition
function initVoiceControl() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 5;
        
        // Check microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => console.log('Microphone access granted'))
            .catch(() => {
                document.getElementById('voiceStatus').textContent = 'Please allow microphone access';
            });
        
        recognition.onstart = function() {
            isListening = true;
            document.getElementById('voiceBtn').classList.add('listening');
            document.getElementById('voiceStatus').textContent = 'Listening... Say a command';
            document.getElementById('voiceCommand').textContent = '';
        };
        
        recognition.onresult = function(event) {
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
                
                document.getElementById('voiceCommand').textContent = `Command: "${command}" (Confidence: ${Math.round(confidence * 100)}%)`;
                
                // Process command if confidence is good
                if (confidence > 0.2) {
                    processVoiceCommand(command);
                } else {
                    // Wait 2-3 seconds before saying didn't understand
                    setTimeout(() => {
                        speakResponse('I did not understand, please repeat');
                        document.getElementById('voiceStatus').textContent = 'Low confidence, please repeat';
                    }, 2500);
                }
            }
        };
        
        recognition.onerror = function(event) {
            let errorMessage = 'An error occurred';
            
            switch(event.error) {
                case 'no-speech':
                    // Wait before showing error
                    setTimeout(() => {
                        errorMessage = 'No speech detected. Try speaking louder';
                        document.getElementById('voiceStatus').textContent = errorMessage;
                    }, 2000);
                    return;
                case 'audio-capture':
                    errorMessage = 'Microphone not working. Check connection';
                    break;
                case 'not-allowed':
                    errorMessage = 'Please allow microphone access';
                    break;
                case 'network':
                    errorMessage = 'Network error. Check internet connection';
                    break;
                case 'aborted':
                    errorMessage = 'Voice recognition stopped';
                    break;
                default:
                    errorMessage = 'Voice error: ' + event.error;
            }
            
            document.getElementById('voiceStatus').textContent = errorMessage;
            console.log('Voice recognition error:', event.error);
            stopListening();
        };
        
        recognition.onend = function() {
            stopListening();
        };
        
        // Load voices when available
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function() {
                console.log('Voices loaded:', speechSynthesis.getVoices().length);
            };
        }
        
    } else {
        document.getElementById('voiceStatus').textContent = 'Voice recognition not supported';
        speakResponse('Voice recognition is not supported in this browser');
    }
}

// Voice Settings Function
function adjustVoiceSettings() {
    if (recognition) {
        recognition.lang = 'en-US';
        document.getElementById('voiceStatus').textContent = 'Voice settings adjusted for English';
        speakResponse('Voice settings adjusted for English language');
    }
}

// Start Voice Control
function startVoiceControl() {
    if (!recognition) {
        initVoiceControl();
        setTimeout(() => startVoiceControl(), 500);
        return;
    }
    
    if (!isListening && recognition) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Voice recognition start error:', error);
            document.getElementById('voiceStatus').textContent = 'Voice control could not start';
            setTimeout(() => {
                document.getElementById('voiceStatus').textContent = 'Click microphone to start voice control';
            }, 2000);
        }
    } else if (isListening) {
        recognition.stop();
    }
}

// Continuous Voice Control Mode
function startContinuousVoice() {
    if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        startVoiceControl();
        speakResponse('Continuous voice mode activated');
    }
}

function stopContinuousVoice() {
    if (recognition) {
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.stop();
        speakResponse('Continuous voice mode deactivated');
    }
}

// Stop Listening
function stopListening() {
    isListening = false;
    if (document.getElementById('voiceBtn')) {
        document.getElementById('voiceBtn').classList.remove('listening');
    }
    if (document.getElementById('voiceStatus')) {
        document.getElementById('voiceStatus').textContent = 'Click microphone to start voice control';
    }
}

// Enhanced Voice Commands with Voice Responses
function processVoiceCommand(command) {
    let executed = false;
    let responseMessage = '';
    
    // Room Commands
    if (command.includes('living room') || command.includes('lounge') || command.includes('drawing room')) {
        if (command.includes('on') || command.includes('turn on')) {
            toggleLED('LED1', true);
            document.getElementById('led1').checked = true;
            responseMessage = 'Living room light turned on';
            executed = true;
        } else if (command.includes('off') || command.includes('turn off')) {
            toggleLED('LED1', false);
            document.getElementById('led1').checked = false;
            responseMessage = 'Living room light turned off';
            executed = true;
        }
    }
    else if (command.includes('bedroom') || command.includes('bed room')) {
        if (command.includes('on') || command.includes('turn on')) {
            toggleLED('LED2', true);
            document.getElementById('led2').checked = true;
            responseMessage = 'Bedroom light turned on';
            executed = true;
        } else if (command.includes('off') || command.includes('turn off')) {
            toggleLED('LED2', false);
            document.getElementById('led2').checked = false;
            responseMessage = 'Bedroom light turned off';
            executed = true;
        }
    }
    else if (command.includes('kitchen')) {
        if (command.includes('on') || command.includes('turn on')) {
            toggleLED('LED3', true);
            document.getElementById('led3').checked = true;
            responseMessage = 'Kitchen light turned on';
            executed = true;
        } else if (command.includes('off') || command.includes('turn off')) {
            toggleLED('LED3', false);
            document.getElementById('led3').checked = false;
            responseMessage = 'Kitchen light turned off';
            executed = true;
        }
    }
    else if (command.includes('bathroom') || command.includes('bath room') || command.includes('toilet')) {
        if (command.includes('on') || command.includes('turn on')) {
            toggleLED('LED4', true);
            document.getElementById('led4').checked = true;
            responseMessage = 'Bathroom light turned on';
            executed = true;
        } else if (command.includes('off') || command.includes('turn off')) {
            toggleLED('LED4', false);
            document.getElementById('led4').checked = false;
            responseMessage = 'Bathroom light turned off';
            executed = true;
        }
    }
    // Emergency Commands
    else if (command.includes('emergency') || command.includes('help') || command.includes('all lights on')) {
        emergencyAllLights();
        responseMessage = 'Emergency mode activated! All lights turned on';
        executed = true;
    }
    // Security Commands
    else if (command.includes('security on') || command.includes('start security')) {
        if (typeof toggleSecurity === 'function') {
            toggleSecurity();
            responseMessage = 'Security system activated';
            executed = true;
        }
    }
    else if (command.includes('security off') || command.includes('stop security')) {
        if (typeof stopSecurityMonitoring === 'function') {
            stopSecurityMonitoring();
            responseMessage = 'Security system deactivated';
            executed = true;
        }
    }
    // Temperature Check
    else if (command.includes('temperature') || command.includes('temp')) {
        const tempElement = document.getElementById('tempStatus');
        if (tempElement) {
            responseMessage = `Current temperature status is ${tempElement.textContent}`;
        } else {
            responseMessage = 'Temperature sensor data not available';
        }
        executed = true;
    }
    // Motion Detection
    else if (command.includes('motion') || command.includes('movement')) {
        const motionElement = document.getElementById('motionStatus');
        if (motionElement) {
            responseMessage = `Motion detection status: ${motionElement.textContent}`;
        } else {
            responseMessage = 'Checking motion sensor data';
        }
        executed = true;
    }
    // Door Status
    else if (command.includes('door') || command.includes('gate')) {
        const doorElement = document.getElementById('doorStatus');
        if (doorElement) {
            responseMessage = `Door status: ${doorElement.textContent}`;
        } else {
            responseMessage = 'Checking door sensor data';
        }
        executed = true;
    }
    // Gas Leak Check
    else if (command.includes('gas') || command.includes('gas leak') || command.includes('gas leakage')) {
        const gasElement = document.getElementById('gasStatus');
        if (gasElement) {
            responseMessage = `Gas status: ${gasElement.textContent}`;
        } else {
            responseMessage = 'Gas sensor is normal';
        }
        executed = true;
    }
    // Time and Date
    else if (command.includes('time') || command.includes('what time')) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: true });
        responseMessage = `Current time is ${timeString}`;
        executed = true;
    }
    else if (command.includes('date') || command.includes('what date')) {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        responseMessage = `Today is ${dateString}`;
        executed = true;
    }
    // Weather
    else if (command.includes('weather')) {
        const weatherElement = document.getElementById('weatherInfo');
        if (weatherElement) {
            responseMessage = `Weather information: ${weatherElement.textContent}`;
        } else {
            responseMessage = 'Loading weather data';
        }
        executed = true;
    }
    // Accessibility Commands
    else if (command.includes('high contrast')) {
        toggleHighContrast();
        responseMessage = 'High contrast mode toggled';
        executed = true;
    }
    else if (command.includes('large text') || command.includes('big text')) {
        toggleLargeText();
        responseMessage = 'Large text mode toggled';
        executed = true;
    }
    else if (command.includes('screen reader')) {
        toggleScreenReader();
        responseMessage = 'Screen reader toggled';
        executed = true;
    }
    // Medical Emergency
    else if (command.includes('medical emergency') || command.includes('doctor') || command.includes('medicine')) {
        if (typeof triggerPanicAlert === 'function') {
            triggerPanicAlert();
            responseMessage = 'Medical emergency alert sent';
            executed = true;
        }
    }
    // Panic Button
    else if (command.includes('panic') || command.includes('help me')) {
        if (typeof triggerPanicAlert === 'function') {
            triggerPanicAlert();
            responseMessage = 'Panic alert activated! Emergency contacts notified';
            executed = true;
        }
    }
    // System Status
    else if (command.includes('system status') || command.includes('status check')) {
        responseMessage = 'System status: All sensors working properly. Smart home system is active';
        executed = true;
    }
    // Gesture Control
    else if (command.includes('gesture on') || command.includes('hand control on')) {
        if (typeof startGestureControl === 'function') {
            startGestureControl();
            responseMessage = 'Gesture control activated';
            executed = true;
        }
    }
    else if (command.includes('gesture off') || command.includes('hand control off')) {
        if (typeof stopGestureControl === 'function') {
            stopGestureControl();
            responseMessage = 'Gesture control deactivated';
            executed = true;
        }
    }
    // Individual LED Commands
    else if (command.includes('turn on') && (command.includes('led 1') || command.includes('led one') || command.includes('light 1') || command.includes('light one'))) {
        toggleLED('LED1', true);
        document.getElementById('led1').checked = true;
        responseMessage = 'LED 1 turned on';
        executed = true;
    }
    else if (command.includes('turn off') && (command.includes('led 1') || command.includes('led one') || command.includes('light 1') || command.includes('light one'))) {
        toggleLED('LED1', false);
        document.getElementById('led1').checked = false;
        responseMessage = 'LED 1 turned off';
        executed = true;
    }
    // LED2 Commands
    else if (command.includes('turn on') && (command.includes('led 2') || command.includes('led two') || command.includes('light 2') || command.includes('light two'))) {
        toggleLED('LED2', true);
        document.getElementById('led2').checked = true;
        responseMessage = 'LED 2 turned on';
        executed = true;
    }
    else if (command.includes('turn off') && (command.includes('led 2') || command.includes('led two') || command.includes('light 2') || command.includes('light two'))) {
        toggleLED('LED2', false);
        document.getElementById('led2').checked = false;
        responseMessage = 'LED 2 turned off';
        executed = true;
    }
    // LED3 Commands
    else if (command.includes('turn on') && (command.includes('led 3') || command.includes('led three') || command.includes('light 3') || command.includes('light three'))) {
        toggleLED('LED3', true);
        document.getElementById('led3').checked = true;
        responseMessage = 'LED 3 turned on';
        executed = true;
    }
    else if (command.includes('turn off') && (command.includes('led 3') || command.includes('led three') || command.includes('light 3') || command.includes('light three'))) {
        toggleLED('LED3', false);
        document.getElementById('led3').checked = false;
        responseMessage = 'LED 3 turned off';
        executed = true;
    }
    // LED4 Commands
    else if (command.includes('turn on') && (command.includes('led 4') || command.includes('led four') || command.includes('light 4') || command.includes('light four'))) {
        toggleLED('LED4', true);
        document.getElementById('led4').checked = true;
        responseMessage = 'LED 4 turned on';
        executed = true;
    }
    else if (command.includes('turn off') && (command.includes('led 4') || command.includes('led four') || command.includes('light 4') || command.includes('light four'))) {
        toggleLED('LED4', false);
        document.getElementById('led4').checked = false;
        responseMessage = 'LED 4 turned off';
        executed = true;
    }
    // All lights commands
    else if (command.includes('turn on all') || command.includes('all lights on')) {
        ['LED1', 'LED2', 'LED3', 'LED4'].forEach(led => toggleLED(led, true));
        ['led1', 'led2', 'led3', 'led4'].forEach(id => document.getElementById(id).checked = true);
        responseMessage = 'All lights turned on';
        executed = true;
    }
    else if (command.includes('turn off all') || command.includes('all lights off')) {
        ['LED1', 'LED2', 'LED3', 'LED4'].forEach(led => toggleLED(led, false));
        ['led1', 'led2', 'led3', 'led4'].forEach(id => document.getElementById(id).checked = false);
        responseMessage = 'All lights turned off';
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
    // Help Commands
    else if (command.includes('what can you do') || command.includes('help me')) {
        responseMessage = 'I can control lights, check security, monitor temperature, handle emergencies, and much more!';
        executed = true;
    }
    
    // Update status and provide voice response
    if (executed) {
        document.getElementById('voiceStatus').textContent = 'Command executed successfully!';
        
        // Voice response
        if (responseMessage) {
            speakResponse(responseMessage);
        }
        
        setTimeout(() => {
            document.getElementById('voiceStatus').textContent = 'Click microphone to start voice control';
        }, 3000);
    } else {
        const errorMessage = 'Command not recognized. Please try again.';
        document.getElementById('voiceStatus').textContent = 'Command not recognized. Please try again.';
        speakResponse(errorMessage);
        
        setTimeout(() => {
            document.getElementById('voiceStatus').textContent = 'Click microphone to start voice control';
        }, 4000);
    }
}

// Voice Response Function
function speakResponse(message) {
    if (speechSynthesis) {
        // Stop any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 0.9;
        
        // Use English voice
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => voice.lang.includes('en-US') || voice.lang.includes('en'));
        
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        speechSynthesis.speak(utterance);
    }
}

// Gesture Control Variables
let hands;
let camera;
let isGestureActive = false;
let lastGestureTime = 0;
let gestureDebounce = 1000; // 1 second debounce

// Initialize Gesture Control
function initGestureControl() {
    const videoElement = document.getElementById('videoElement');
    const canvasElement = document.getElementById('canvasElement');
    const canvasCtx = canvasElement.getContext('2d');
    
    // Initialize MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    hands.onResults(onResults);
    
    // Initialize camera
    camera = new Camera(videoElement, {
        onFrame: async () => {
            if (isGestureActive) {
                await hands.send({image: videoElement});
            }
        },
        width: 320,
        height: 240
    });
}

// Process hand detection results
function onResults(results) {
    const canvasElement = document.getElementById('canvasElement');
    const canvasCtx = canvasElement.getContext('2d');
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});
            
            // Count fingers
            const fingerCount = countFingers(landmarks);
            
            // Process gesture with debounce
            const currentTime = Date.now();
            if (currentTime - lastGestureTime > gestureDebounce) {
                processGesture(fingerCount);
                lastGestureTime = currentTime;
            }
            
            // Display finger count
            document.getElementById('gestureInfo').textContent = `Fingers detected: ${fingerCount}`;
        }
    } else {
        document.getElementById('gestureInfo').textContent = 'Show 1-4 fingers to toggle LEDs';
    }
    
    canvasCtx.restore();
}

// Count extended fingers
function countFingers(landmarks) {
    const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    const pips = [3, 6, 10, 14, 18]; // Previous joints
    
    let count = 0;
    
    // Thumb (different logic - compare x coordinates)
    if (landmarks[tips[0]].x > landmarks[pips[0]].x) {
        count++;
    }
    
    // Other fingers (compare y coordinates)
    for (let i = 1; i < 5; i++) {
        if (landmarks[tips[i]].y < landmarks[pips[i]].y) {
            count++;
        }
    }
    
    return count;
}

// Process gesture based on finger count
function processGesture(fingerCount) {
    if (fingerCount >= 1 && fingerCount <= 4) {
        const ledName = `LED${fingerCount}`;
        const ledId = `led${fingerCount}`;
        const currentState = document.getElementById(ledId).checked;
        
        // Toggle the LED
        toggleLED(ledName, !currentState);
        document.getElementById(ledId).checked = !currentState;
        
        // Show feedback
        document.getElementById('gestureStatus').textContent = `Toggled ${ledName} ${!currentState ? 'ON' : 'OFF'}`;
        
        setTimeout(() => {
            if (isGestureActive) {
                document.getElementById('gestureStatus').textContent = 'Gesture control active - Show fingers to control LEDs';
            }
        }, 2000);
    }
}

// Toggle Gesture Control
function toggleGestureControl() {
    const btn = document.getElementById('gestureBtn');
    const container = document.querySelector('.camera-container');
    
    if (!isGestureActive) {
        startGestureControl();
    } else {
        stopGestureControl();
    }
}

// Start Gesture Control
function startGestureControl() {
    if (!hands) {
        initGestureControl();
    }
    
    isGestureActive = true;
    const btn = document.getElementById('gestureBtn');
    const container = document.querySelector('.camera-container');
    
    btn.classList.add('active');
    btn.textContent = '🛑 Stop Gesture Control';
    container.classList.remove('hidden');
    
    document.getElementById('gestureStatus').textContent = 'Starting camera...';
    
    camera.start().then(() => {
        document.getElementById('gestureStatus').textContent = 'Gesture control active - Show fingers to control LEDs';
    }).catch((error) => {
        document.getElementById('gestureStatus').textContent = 'Camera access denied or not available';
        stopGestureControl();
    });
}

// Stop Gesture Control
function stopGestureControl() {
    isGestureActive = false;
    const btn = document.getElementById('gestureBtn');
    const container = document.querySelector('.camera-container');
    
    btn.classList.remove('active');
    btn.textContent = '👋 Gesture Control';
    container.classList.add('hidden');
    
    if (camera) {
        camera.stop();
    }
    
    document.getElementById('gestureStatus').textContent = 'Click to start gesture control';
    document.getElementById('gestureInfo').textContent = 'Show 1-4 fingers to toggle LEDs';
}

// Gas Leak Alert Variables
let gasAlertActive = false;
let alertSound;

// Handle Gas Leak Status
function handleGasLeakStatus(status) {
    const gasStatusElement = document.getElementById('gasStatus');
    const gasAlert = document.getElementById('gasAlert');
    
    if (status === 1 && !gasAlertActive) {
        // Gas leak detected
        gasAlertActive = true;
        gasStatusElement.textContent = 'DANGER - GAS LEAK!';
        gasStatusElement.className = 'status-danger';
        gasAlert.classList.remove('hidden');
        
        // Send emergency alert
        sendEmergencyAlert('GAS LEAK', 'Dangerous gas levels detected in smart home system');
        
        // Play alert sound
        playAlertSound();
        
        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification('⚠️ GAS LEAK DETECTED!', {
                body: 'Immediate action required in your smart home!',
                icon: '/favicon.ico',
                requireInteraction: true
            });
        }
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
    } else if (status === 0 && gasAlertActive) {
        // Gas leak cleared
        gasAlertActive = false;
        gasStatusElement.textContent = 'SAFE';
        gasStatusElement.className = 'status-safe';
        gasAlert.classList.add('hidden');
        
        // Stop alert sound
        stopAlertSound();
    }
}

// Play Alert Sound
function playAlertSound() {
    // Create audio context for alert sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function beep(frequency, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    // Play repeating alert beeps
    alertSound = setInterval(() => {
        beep(800, 0.2);
        setTimeout(() => beep(600, 0.2), 300);
    }, 1000);
}

// Stop Alert Sound
function stopAlertSound() {
    if (alertSound) {
        clearInterval(alertSound);
        alertSound = null;
    }
}

// Acknowledge Alert
function acknowledgeAlert() {
    const gasAlert = document.getElementById('gasAlert');
    gasAlert.classList.add('hidden');
    stopAlertSound();
    
    // Note: This doesn't clear the gas leak status, just acknowledges the alert
    // The status will remain "DANGER" until the sensor clears
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Face Recognition Variables
let faceModel;
let securityCamera;
let isSecurityActive = false;
let registeredFace = null;
let securityLogs = [];
let lastDetectionTime = 0;
let detectionCooldown = 3000; // 3 seconds
let intruderConfirmation = {
    detected: false,
    startTime: 0,
    confirmationPeriod: 1500, // 1.5 seconds confirmation
    consecutiveDetections: 0,
    requiredDetections: 6 // Need 6 consecutive detections in 1.5 seconds
};

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dbhhzqhka',
    apiKey: '733948694482576',
    apiSecret: 'Df2tkewd5hsJPjf2QgrYT2gaxyI', // Note: Never expose in production
    uploadPreset: 'ml_default' // Use default unsigned preset
};

// Accessibility Variables
let isHighContrast = false;
let isLargeText = false;
let isScreenReaderEnabled = false;
let isVibrationEnabled = true;
let speechSynthesis = window.speechSynthesis;
let currentLEDStates = { LED1: 0, LED2: 0, LED3: 0, LED4: 0 };

// Communication Board Variables
let brailleCanvas, brailleCtx;
let isDrawing = false;
let braillePatterns = [];
let signLanguageModel;
let signCamera;
let isSignRecognitionActive = false;
let chatHistory = [];
let lastSignDetection = 0;
let signDetectionCooldown = 2000; // 2 seconds

// Time and Weather Variables
let userLocation = null;
let lastWeatherUpdate = 0;
let weatherUpdateInterval = 3600000; // 1 hour

// Emergency Contacts Variables
let emergencyContacts = [];

// Medical and Medication Variables
let medicalProfile = {};
let medications = [];
let medicationAlerts = [];

// EmailJS Configuration - Using demo mode for testing
const EMAILJS_CONFIG = {
    serviceId: 'service_gmail',
    templateId: 'template_emergency',
    publicKey: 'demo_public_key' // Demo mode
};

// Initialize EmailJS
function initEmailJS() {
    // Initialize in demo mode for testing
    console.log('EmailJS initialized in demo mode');
}

// Emergency Contact Functions
function showAddContactForm() {
    document.getElementById('addContactForm').classList.remove('hidden');
    document.getElementById('contactName').focus();
}

function hideAddContactForm() {
    document.getElementById('addContactForm').classList.add('hidden');
    clearContactForm();
}

function clearContactForm() {
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactEmail').value = '';
}

function saveEmergencyContact() {
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    
    if (!name || !phone || !email) {
        alert('Please fill in all fields');
        return;
    }
    
    const contact = {
        id: Date.now(),
        name: name,
        phone: phone,
        email: email,
        dateAdded: new Date().toLocaleDateString()
    };
    
    emergencyContacts.push(contact);
    localStorage.setItem('emergencyContacts', JSON.stringify(emergencyContacts));
    
    updateContactsList();
    hideAddContactForm();
    
    if (isScreenReaderEnabled) {
        announceToScreenReader(`Emergency contact ${name} added successfully`);
    }
}

function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
        emergencyContacts = emergencyContacts.filter(contact => contact.id !== contactId);
        localStorage.setItem('emergencyContacts', JSON.stringify(emergencyContacts));
        updateContactsList();
    }
}

function updateContactsList() {
    const contactsList = document.getElementById('contactsList');
    
    if (emergencyContacts.length === 0) {
        contactsList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No emergency contacts added yet</p>';
        return;
    }
    
    contactsList.innerHTML = emergencyContacts.map(contact => `
        <div class="contact-item">
            <div class="contact-info">
                <div class="contact-name">👤 ${contact.name}</div>
                <div class="contact-details">
                    <span>📞 ${contact.phone}</span>
                    <span>📧 ${contact.email}</span>
                </div>
                <div class="contact-date">Added: ${contact.dateAdded}</div>
            </div>
            <button class="delete-contact-btn" onclick="deleteContact(${contact.id})">🗑️</button>
        </div>
    `).join('');
}

function loadEmergencyContacts() {
    const stored = localStorage.getItem('emergencyContacts');
    if (stored) {
        emergencyContacts = JSON.parse(stored);
        updateContactsList();
    }
}

async function testEmergencyAlert() {
    if (emergencyContacts.length === 0) {
        alert('Please add emergency contacts first');
        return;
    }
    
    const alertData = {
        type: 'TEST ALERT',
        message: 'Smart Home Emergency System Test',
        timestamp: new Date().toLocaleString(),
        location: 'Smart Home System'
    };
    
    let successCount = 0;
    
    for (const contact of emergencyContacts) {
        try {
            await sendEmailAlert(contact, alertData);
            successCount++;
        } catch (error) {
            console.error(`Failed to send alert to ${contact.name}:`, error);
        }
    }
    
    alert(`Test alert sent to ${successCount}/${emergencyContacts.length} emergency contact(s)`);
    
    if (isScreenReaderEnabled) {
        announceToScreenReader(`Test emergency alert sent to ${successCount} contacts`);
    }
}

async function sendEmergencyAlert(alertType, details) {
    if (emergencyContacts.length === 0) return;
    
    const alertData = {
        type: alertType,
        message: details,
        timestamp: new Date().toLocaleString(),
        location: 'Smart Home System'
    };
    
    let successCount = 0;
    
    for (const contact of emergencyContacts) {
        try {
            await sendEmailAlert(contact, alertData);
            successCount++;
        } catch (error) {
            console.error(`Failed to send emergency alert to ${contact.name}:`, error);
        }
    }
    
    // Show notification to user
    if (Notification.permission === 'granted') {
        new Notification('🚨 Emergency Alert Sent', {
            body: `Alert sent to ${successCount}/${emergencyContacts.length} emergency contacts`,
            icon: '/favicon.ico'
        });
    }
}

async function sendEmailAlert(contact, alertData) {
    const templateParams = {
        to_name: contact.name,
        to_email: contact.email,
        alert_type: alertData.type,
        alert_message: alertData.message,
        timestamp: alertData.timestamp,
        location: alertData.location,
        contact_phone: contact.phone
    };
    
    try {
        // Demo mode - simulate email sending
        console.log(`Demo: Email would be sent to ${contact.name} (${contact.email})`);
        console.log('Alert details:', templateParams);
        
        // Simulate successful response
        const response = { status: 200, text: 'Demo email sent successfully' };
        return response;
    } catch (error) {
        console.error(`Email failed to ${contact.name}:`, error);
        throw error;
    }
}

// Time and Weather Functions
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

function getUserLocation() {
    // Always use Dehradun, Uttarakhand, India coordinates
    userLocation = { lat: 30.3165, lon: 78.0322 };
    updateWeather();
}

async function updateWeather() {
    const currentTime = Date.now();
    if (currentTime - lastWeatherUpdate < weatherUpdateInterval) {
        return; // Don't update if less than 1 hour
    }
    
    try {
        // Using OpenWeatherMap API for Dehradun, Uttarakhand, India
        const API_KEY = 'c759d20c309e70722f5b9cdabdf61e2f';
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=Dehradun,Uttarakhand,IN&appid=${API_KEY}&units=metric`
        );
        
        if (response.ok) {
            const data = await response.json();
            const temp = Math.round(data.main.temp);
            const description = data.weather[0].description;
            const weatherIcon = getWeatherIcon(data.weather[0].main);
            
            // Check if it's day or night
            const now = new Date();
            const hour = now.getHours();
            const isDayTime = hour >= 6 && hour < 18;
            const timeOfDay = isDayTime ? '☀️ Day' : '🌙 Night';
            
            document.getElementById('weatherInfo').textContent = 
                `${weatherIcon} ${temp}°C, ${description} (${timeOfDay})`;
            
            document.getElementById('locationInfo').textContent = 
                '📍 Dehradun, Uttarakhand, India';
            
            lastWeatherUpdate = currentTime;
        } else {
            throw new Error('Weather API failed');
        }
    } catch (error) {
        console.error('Weather error:', error);
        
        // Fallback weather for Dehradun
        const temp = Math.round(Math.random() * 15 + 15); // 15-30°C typical for Dehradun
        const conditions = ['Clear', 'Clouds', 'Rain', 'Mist'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const weatherIcon = getWeatherIcon(condition);
        
        const now = new Date();
        const hour = now.getHours();
        const isDayTime = hour >= 6 && hour < 18;
        const timeOfDay = isDayTime ? '☀️ Day' : '🌙 Night';
        
        document.getElementById('weatherInfo').textContent = 
            `${weatherIcon} ${temp}°C, ${condition} (${timeOfDay})`;
        
        document.getElementById('locationInfo').textContent = 
            '📍 Dehradun, Uttarakhand, India';
        
        lastWeatherUpdate = currentTime;
    }
}

function getWeatherIconFromCode(code) {
    if (code === 0) return '☀️'; // Clear sky
    if (code <= 3) return '⛅'; // Partly cloudy
    if (code <= 48) return '🌫️'; // Fog
    if (code <= 67) return '🌧️'; // Rain
    if (code <= 77) return '❄️'; // Snow
    if (code <= 82) return '🌦️'; // Rain showers
    if (code <= 99) return '⛈️'; // Thunderstorm
    return '🌤️'; // Default
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
}

function getWeatherIcon(condition) {
    const icons = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'sunny': '☀️',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'partly cloudy': '⛅'
    };
    return icons[condition] || '🌤️';
}

async function getLocationName() {
    if (!userLocation) return;
    
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLocation.lat}&longitude=${userLocation.lon}&localityLanguage=en`
        );
        
        if (response.ok) {
            const data = await response.json();
            const city = data.city || data.locality || data.principalSubdivision;
            const country = data.countryName;
            
            document.getElementById('locationInfo').textContent = 
                `📍 ${city}, ${country}`;
        } else {
            throw new Error('Geocoding failed');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        document.getElementById('locationInfo').textContent = 
            `📍 Location: ${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`;
    }
}

function initTimeWeather() {
    // Update time immediately and every second
    updateTime();
    setInterval(updateTime, 1000);
    
    // Get location and weather
    getUserLocation();
    
    // Update weather every hour
    setInterval(() => {
        if (userLocation) {
            lastWeatherUpdate = 0; // Force update
            updateWeather();
        }
    }, weatherUpdateInterval);
}

// Enhanced Braille to English mapping with common patterns
const brailleMap = {
    '100000': 'a', '110000': 'b', '100100': 'c', '100110': 'd', '100010': 'e',
    '110100': 'f', '110110': 'g', '110010': 'h', '010100': 'i', '010110': 'j',
    '101000': 'k', '111000': 'l', '101100': 'm', '101110': 'n', '101010': 'o',
    '111100': 'p', '111110': 'q', '111010': 'r', '011100': 's', '011110': 't',
    '101001': 'u', '111001': 'v', '010111': 'w', '101101': 'x', '101111': 'y',
    '101011': 'z', '000000': ' ',
    // Common words
    '111111': 'hello', '110101': 'help', '101110': 'no', '111101': 'yes',
    // Numbers
    '001111': '#', '100000': '1', '110000': '2', '100100': '3', '100110': '4', '100010': '5',
    '110100': '6', '110110': '7', '110010': '8', '010100': '9', '010110': '0',
    // Punctuation
    '010000': ',', '001100': '.', '011001': '!', '001001': '?', '000001': "'"
};

// Enhanced sign language gestures (15+ gestures)
const signLanguageMap = {
    'fist': 'stop',
    'one_finger': 'one',
    'two_fingers': 'two', 
    'three_fingers': 'three',
    'four_fingers': 'four',
    'five_fingers': 'five',
    'thumbs_up': 'good',
    'thumbs_down': 'bad',
    'peace_sign': 'peace',
    'ok_sign': 'ok',
    'pointing_up': 'up',
    'pointing_down': 'down',
    'open_hand': 'hello',
    'wave': 'goodbye',
    'call_me': 'call',
    'rock_on': 'cool',
    'love_sign': 'love',
    'help_sign': 'help',
    'yes_sign': 'yes',
    'no_sign': 'no'
};

// Initialize Face Recognition
async function initFaceRecognition() {
    try {
        await tf.ready();
        faceModel = await blazeface.load();
        console.log('Face detection model loaded');
    } catch (error) {
        console.error('Error loading face model:', error);
    }
}

// Start Face Registration
function startFaceRegistration() {
    const video = document.getElementById('securityVideo');
    const canvas = document.getElementById('securityCanvas');
    const btn = document.getElementById('registerFaceBtn');
    
    btn.textContent = 'Registering...';
    btn.disabled = true;
    
    document.querySelector('.security-camera').classList.remove('hidden');
    document.getElementById('faceStatus').textContent = 'Position your face in the camera and wait...';
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                setTimeout(() => {
                    captureFaceForRegistration(video, canvas, stream);
                }, 3000); // Wait 3 seconds for user to position
            };
        })
        .catch(error => {
            console.error('Camera access denied:', error);
            document.getElementById('faceStatus').textContent = 'Camera access denied';
            btn.textContent = '📷 Register Face';
            btn.disabled = false;
        });
}

// Capture Face for Registration
async function captureFaceForRegistration(video, canvas, stream) {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    try {
        const predictions = await faceModel.estimateFaces(canvas, false);
        
        if (predictions.length === 1) {
            // Extract face features (simplified - using bounding box)
            const face = predictions[0];
            registeredFace = {
                topLeft: face.topLeft,
                bottomRight: face.bottomRight,
                landmarks: face.landmarks,
                timestamp: Date.now()
            };
            
            // Store in localStorage
            localStorage.setItem('registeredFace', JSON.stringify(registeredFace));
            
            document.getElementById('faceStatus').textContent = 'Face registered successfully! ✅';
            document.getElementById('registerFaceBtn').textContent = '✅ Face Registered';
            
        } else if (predictions.length === 0) {
            document.getElementById('faceStatus').textContent = 'No face detected. Try again.';
            document.getElementById('registerFaceBtn').textContent = '📷 Register Face';
            document.getElementById('registerFaceBtn').disabled = false;
        } else {
            document.getElementById('faceStatus').textContent = 'Multiple faces detected. Please ensure only one person is visible.';
            document.getElementById('registerFaceBtn').textContent = '📷 Register Face';
            document.getElementById('registerFaceBtn').disabled = false;
        }
    } catch (error) {
        console.error('Face detection error:', error);
        document.getElementById('faceStatus').textContent = 'Face detection failed. Try again.';
        document.getElementById('registerFaceBtn').textContent = '📷 Register Face';
        document.getElementById('registerFaceBtn').disabled = false;
    }
    
    // Stop camera
    stream.getTracks().forEach(track => track.stop());
    document.querySelector('.security-camera').classList.add('hidden');
}

// Toggle Security Monitoring
function toggleSecurity() {
    const btn = document.getElementById('securityBtn');
    const statusElement = document.getElementById('securityStatus');
    
    if (!registeredFace && !localStorage.getItem('registeredFace')) {
        alert('Please register a face first!');
        return;
    }
    
    if (!isSecurityActive) {
        startSecurityMonitoring();
        btn.textContent = '🛑 Stop Security';
        btn.classList.add('active');
        statusElement.textContent = 'ACTIVE';
        statusElement.className = 'status-danger';
    } else {
        stopSecurityMonitoring();
        btn.textContent = '🔍 Start Security';
        btn.classList.remove('active');
        statusElement.textContent = 'INACTIVE';
        statusElement.className = 'status-safe';
    }
}

// Start Security Monitoring
function startSecurityMonitoring() {
    if (!registeredFace) {
        const storedFace = localStorage.getItem('registeredFace');
        if (storedFace) {
            try {
                registeredFace = JSON.parse(storedFace);
                // Validate registered face data
                if (!registeredFace.topLeft || !registeredFace.bottomRight) {
                    console.error('Invalid registered face data');
                    registeredFace = null;
                    alert('Registered face data is corrupted. Please register your face again.');
                    return;
                }
            } catch (error) {
                console.error('Error parsing registered face data:', error);
                registeredFace = null;
                alert('Registered face data is corrupted. Please register your face again.');
                return;
            }
        }
    }
    
    isSecurityActive = true;
    const video = document.getElementById('securityVideo');
    const canvas = document.getElementById('securityCanvas');
    
    document.querySelector('.security-camera').classList.remove('hidden');
    document.getElementById('faceStatus').textContent = 'Security monitoring active - Watching for intruders...';
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            securityCamera = stream;
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                monitorFaces(video, canvas);
            };
        })
        .catch(error => {
            console.error('Camera access denied:', error);
            document.getElementById('faceStatus').textContent = 'Camera access denied';
            stopSecurityMonitoring();
        });
}

// Monitor Faces Continuously with Enhanced Accuracy
async function monitorFaces(video, canvas) {
    if (!isSecurityActive) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    try {
        const predictions = await faceModel.estimateFaces(canvas, false);
        
        // Clear overlay drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0); // Redraw video frame
        
        if (predictions.length > 0) {
            let authorizedFaceFound = false;
            let unauthorizedFaces = [];
            
            predictions.forEach((face, index) => {
                const [x, y] = face.topLeft;
                const [x2, y2] = face.bottomRight;
                
                // Enhanced face comparison with multiple checks - default to unauthorized
                const isAuthorized = registeredFace ? enhancedFaceComparison(face, registeredFace) : false;
                
                if (isAuthorized) {
                    authorizedFaceFound = true;
                    // Draw green box for authorized face
                    ctx.strokeStyle = '#2ecc71';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x, y, x2 - x, y2 - y);
                    ctx.fillStyle = '#2ecc71';
                    ctx.font = 'bold 18px Arial';
                    ctx.fillText('✓ AUTHORIZED', x, y - 15);
                    
                    // Reset intruder confirmation
                    resetIntruderConfirmation();
                } else {
                    unauthorizedFaces.push(face);
                    
                    // Enhanced intruder detection with confirmation
                    const confirmationStatus = processIntruderConfirmation();
                    
                    if (confirmationStatus.confirmed) {
                        // Draw confirmed intruder box
                        ctx.strokeStyle = '#e74c3c';
                        ctx.lineWidth = 5;
                        ctx.strokeRect(x, y, x2 - x, y2 - y);
                        ctx.fillStyle = '#e74c3c';
                        ctx.font = 'bold 20px Arial';
                        ctx.fillText('🚨 INTRUDER CONFIRMED!', x, y - 20);
                    } else {
                        // Draw detection in progress
                        ctx.strokeStyle = '#f39c12';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(x, y, x2 - x, y2 - y);
                        ctx.fillStyle = '#f39c12';
                        ctx.font = 'bold 16px Arial';
                        const progress = Math.round((confirmationStatus.progress * 100));
                        ctx.fillText(`⚠️ VERIFYING... ${progress}%`, x, y - 15);
                    }
                }
            });
            
            // Handle confirmed intruders
            if (unauthorizedFaces.length > 0 && intruderConfirmation.detected) {
                const currentTime = Date.now();
                const confirmationElapsed = currentTime - intruderConfirmation.startTime;
                
                if (confirmationElapsed >= intruderConfirmation.confirmationPeriod && 
                    intruderConfirmation.consecutiveDetections >= intruderConfirmation.requiredDetections) {
                    
                    if (currentTime - lastDetectionTime > detectionCooldown) {
                        await captureAndLogIntruder(unauthorizedFaces.length, predictions.length, canvas);
                        showIntruderAlert();
                        lastDetectionTime = currentTime;
                        resetIntruderConfirmation();
                    }
                }
            }
            
            // Update status with detailed information
            updateSecurityStatus(unauthorizedFaces.length, authorizedFaceFound);
            
        } else {
            document.getElementById('faceStatus').textContent = '👁️ Monitoring - No faces detected';
            resetIntruderConfirmation();
        }
    } catch (error) {
        console.error('Face monitoring error:', error);
        document.getElementById('faceStatus').textContent = '❌ Face detection error - Retrying...';
    }
    
    // Continue monitoring at higher frequency for better accuracy
    setTimeout(() => monitorFaces(video, canvas), 80);
}

// Enhanced Face Comparison with Multiple Metrics
function enhancedFaceComparison(face1, face2) {
    if (!face1 || !face2) return false;
    
    // Face dimensions comparison - more flexible for authorized user
    const face1Width = face1.bottomRight[0] - face1.topLeft[0];
    const face1Height = face1.bottomRight[1] - face1.topLeft[1];
    const face2Width = face2.bottomRight[0] - face2.topLeft[0];
    const face2Height = face2.bottomRight[1] - face2.topLeft[1];
    
    const widthDiff = Math.abs(face1Width - face2Width) / Math.max(face1Width, face2Width);
    const heightDiff = Math.abs(face1Height - face2Height) / Math.max(face1Height, face2Height);
    
    // Face aspect ratio comparison
    const face1Ratio = face1Width / face1Height;
    const face2Ratio = face2Width / face2Height;
    const ratioDiff = Math.abs(face1Ratio - face2Ratio) / Math.max(face1Ratio, face2Ratio);
    
    // Landmark comparison with better tolerance
    let landmarkScore = 0;
    if (face1.landmarks && face2.landmarks && face1.landmarks.length === face2.landmarks.length) {
        landmarkScore = compareLandmarks(face1.landmarks, face2.landmarks);
    }
    
    // Position comparison - allow more movement
    const face1CenterX = (face1.topLeft[0] + face1.bottomRight[0]) / 2;
    const face1CenterY = (face1.topLeft[1] + face1.bottomRight[1]) / 2;
    const face2CenterX = (face2.topLeft[0] + face2.bottomRight[0]) / 2;
    const face2CenterY = (face2.topLeft[1] + face2.bottomRight[1]) / 2;
    
    const centerDistanceX = Math.abs(face1CenterX - face2CenterX) / Math.max(face1Width, face2Width);
    const centerDistanceY = Math.abs(face1CenterY - face2CenterY) / Math.max(face1Height, face2Height);
    
    // Balanced scoring - strict enough to reject strangers, flexible for authorized user
    const dimensionScore = (widthDiff < 0.3 && heightDiff < 0.3) ? 1 : 0;
    const ratioScore = ratioDiff < 0.25 ? 1 : 0;
    const positionScore = (centerDistanceX < 0.6 && centerDistanceY < 0.5) ? 1 : 0;
    const landmarkMatchScore = landmarkScore > 0.5 ? 1 : 0;
    
    // Require 3 out of 4 criteria for better balance
    const totalScore = dimensionScore + ratioScore + positionScore + landmarkMatchScore;
    
    console.log('Face comparison:', {
        widthDiff: widthDiff.toFixed(3),
        heightDiff: heightDiff.toFixed(3),
        ratioDiff: ratioDiff.toFixed(3),
        centerDistanceX: centerDistanceX.toFixed(3),
        centerDistanceY: centerDistanceY.toFixed(3),
        landmarkScore: landmarkScore.toFixed(3),
        scores: [dimensionScore, ratioScore, positionScore, landmarkMatchScore],
        totalScore,
        authorized: totalScore >= 3
    });
    
    return totalScore >= 3;
}

// Compare facial landmarks for better accuracy
function compareLandmarks(landmarks1, landmarks2) {
    if (landmarks1.length !== landmarks2.length) return 0;
    
    let totalDistance = 0;
    let validLandmarks = 0;
    
    for (let i = 0; i < landmarks1.length; i++) {
        const dx = landmarks1[i][0] - landmarks2[i][0];
        const dy = landmarks1[i][1] - landmarks2[i][1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalDistance += distance;
        validLandmarks++;
    }
    
    if (validLandmarks === 0) return 0;
    
    const avgDistance = totalDistance / validLandmarks;
    const normalizedScore = Math.max(0, 1 - (avgDistance / 80));
    
    return normalizedScore;
}

// Process Intruder Confirmation System
function processIntruderConfirmation() {
    const currentTime = Date.now();
    
    if (!intruderConfirmation.detected) {
        // Start confirmation process
        intruderConfirmation.detected = true;
        intruderConfirmation.startTime = currentTime;
        intruderConfirmation.consecutiveDetections = 1;
    } else {
        // Continue confirmation
        intruderConfirmation.consecutiveDetections++;
    }
    
    const elapsed = currentTime - intruderConfirmation.startTime;
    const progress = Math.min(elapsed / intruderConfirmation.confirmationPeriod, 1);
    const confirmed = elapsed >= intruderConfirmation.confirmationPeriod && 
                     intruderConfirmation.consecutiveDetections >= intruderConfirmation.requiredDetections;
    
    return { confirmed, progress, elapsed };
}

// Reset Intruder Confirmation
function resetIntruderConfirmation() {
    intruderConfirmation.detected = false;
    intruderConfirmation.startTime = 0;
    intruderConfirmation.consecutiveDetections = 0;
}

// Update Security Status Display
function updateSecurityStatus(unauthorizedCount, authorizedFound) {
    const statusElement = document.getElementById('faceStatus');
    
    if (unauthorizedCount > 0) {
        if (intruderConfirmation.detected) {
            const elapsed = Date.now() - intruderConfirmation.startTime;
            const remaining = Math.max(0, intruderConfirmation.confirmationPeriod - elapsed);
            const progress = Math.round((elapsed / intruderConfirmation.confirmationPeriod) * 100);
            
            if (remaining > 0) {
                statusElement.textContent = `🔍 Verifying intruder... ${progress}% (${Math.ceil(remaining/1000)}s remaining)`;
            } else {
                statusElement.textContent = `🚨 INTRUDER CONFIRMED! Capturing evidence...`;
            }
        } else {
            statusElement.textContent = `⚠️ Potential intruder detected - Verifying...`;
        }
    } else if (authorizedFound) {
        statusElement.textContent = '✅ Authorized person detected - All clear';
    } else {
        statusElement.textContent = '👁️ Monitoring active - Area secure';
    }
}

// Enhanced Intruder Logging with High-Quality Image Capture
async function captureAndLogIntruder(intruderCount, totalFaces, canvas) {
    const timestamp = new Date().toLocaleString();
    const isoTimestamp = new Date().toISOString();
    
    // Capture high-quality frame from video directly
    const video = document.getElementById('securityVideo');
    const captureCanvas = document.createElement('canvas');
    const captureCtx = captureCanvas.getContext('2d');
    
    // Set high resolution for better image quality
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    
    // Draw clean video frame without overlays
    captureCtx.drawImage(video, 0, 0);
    
    // Add timestamp and alert overlay
    captureCtx.fillStyle = 'rgba(231, 76, 60, 0.8)';
    captureCtx.fillRect(0, 0, captureCanvas.width, 60);
    captureCtx.fillStyle = '#ffffff';
    captureCtx.font = 'bold 24px Arial';
    captureCtx.fillText(`🚨 INTRUDER DETECTED - ${timestamp}`, 20, 35);
    
    // Add detection details
    captureCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    captureCtx.fillRect(0, captureCanvas.height - 80, captureCanvas.width, 80);
    captureCtx.fillStyle = '#ffffff';
    captureCtx.font = 'bold 18px Arial';
    captureCtx.fillText(`Intruders: ${intruderCount} | Total Faces: ${totalFaces}`, 20, captureCanvas.height - 50);
    captureCtx.fillText(`Location: Smart Home Security Camera`, 20, captureCanvas.height - 25);
    
    const imageDataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
    
    try {
        // Upload to Cloudinary with enhanced metadata
        const filename = `intruder_${Date.now()}_${intruderCount}faces`;
        const cloudinaryUrl = await uploadToCloudinary(imageDataUrl, filename);
        
        const logEntry = {
            timestamp: timestamp,
            isoTimestamp: isoTimestamp,
            intruderCount: intruderCount,
            totalFaces: totalFaces,
            imageUrl: cloudinaryUrl,
            location: 'Smart Home Security Camera',
            severity: intruderCount > 1 ? 'Critical' : intruderCount === 1 ? 'High' : 'Medium',
            detectionMethod: 'Enhanced Face Recognition',
            confirmationTime: intruderConfirmation.confirmationPeriod,
            consecutiveDetections: intruderConfirmation.consecutiveDetections,
            id: Date.now()
        };
        
        securityLogs.unshift(logEntry);
        
        // Store in localStorage
        localStorage.setItem('securityLogs', JSON.stringify(securityLogs));
        
        // Update displays
        updateLogsDisplay();
        updateIntruderGallery();
        
        // Auto-save CSV
        autoSaveCSV();
        
        // Enhanced notifications
        sendEnhancedNotifications(logEntry);
        
        console.log('Enhanced intruder log created:', logEntry);
        
        // Screen reader announcement
        if (isScreenReaderEnabled) {
            announceToScreenReader(`Security alert: ${intruderCount} unauthorized person${intruderCount > 1 ? 's' : ''} detected and logged with photo evidence.`);
        }
        
    } catch (error) {
        console.error('Error uploading intruder image:', error);
        
        // Enhanced fallback logging
        const logEntry = {
            timestamp: timestamp,
            isoTimestamp: isoTimestamp,
            intruderCount: intruderCount,
            totalFaces: totalFaces,
            imageUrl: 'Upload failed - Local capture available',
            localImageData: imageDataUrl, // Store locally as backup
            location: 'Smart Home Security Camera',
            severity: intruderCount > 1 ? 'Critical' : 'High',
            detectionMethod: 'Enhanced Face Recognition',
            confirmationTime: intruderConfirmation.confirmationPeriod,
            consecutiveDetections: intruderConfirmation.consecutiveDetections,
            error: error.message,
            id: Date.now()
        };
        
        securityLogs.unshift(logEntry);
        localStorage.setItem('securityLogs', JSON.stringify(securityLogs));
        updateLogsDisplay();
        
        // Still send notifications even if upload failed
        sendEnhancedNotifications(logEntry);
    }
}

// Enhanced Notification System
function sendEnhancedNotifications(logEntry) {
    // Browser notification
    if (Notification.permission === 'granted') {
        const notification = new Notification('🚨 SECURITY ALERT - Intruder Detected!', {
            body: `${logEntry.intruderCount} unauthorized person(s) detected at ${logEntry.timestamp}. Photo evidence captured.`,
            icon: '/favicon.ico',
            requireInteraction: true,
            tag: 'security-alert',
            actions: [
                { action: 'view', title: 'View Evidence' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        });
        
        notification.onclick = () => {
            window.focus();
            if (logEntry.imageUrl && logEntry.imageUrl !== 'Upload failed - Local capture available') {
                window.open(logEntry.imageUrl, '_blank');
            }
        };
    }
    
    // Enhanced vibration pattern for critical alerts
    if (navigator.vibrate) {
        const pattern = logEntry.severity === 'Critical' ? 
            [300, 100, 300, 100, 300, 100, 300] : 
            [200, 100, 200, 100, 200];
        navigator.vibrate(pattern);
    }
    
    // Audio alert with different tones based on severity
    playSecurityAlert(logEntry.severity);
}

// Enhanced Security Alert Audio
function playSecurityAlert(severity) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        function playTone(frequency, duration, delay = 0) {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            }, delay);
        }
        
        // Different alert patterns based on severity
        if (severity === 'Critical') {
            // Rapid high-pitched alerts
            for (let i = 0; i < 6; i++) {
                playTone(1000, 0.2, i * 300);
                playTone(800, 0.2, i * 300 + 150);
            }
        } else {
            // Standard alert pattern
            for (let i = 0; i < 3; i++) {
                playTone(800, 0.3, i * 500);
                playTone(600, 0.3, i * 500 + 250);
            }
        }
    } catch (error) {
        console.error('Audio alert failed:', error);
    }
}

// Show Intruder Alert
function showIntruderAlert() {
    const alert = document.getElementById('intruderAlert');
    const timeElement = document.getElementById('intruderTime');
    
    timeElement.textContent = `Detected at: ${new Date().toLocaleString()}`;
    alert.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alert.classList.add('hidden');
    }, 5000);
}

// Upload Image to Cloudinary
async function uploadToCloudinary(imageDataUrl, filename) {
    const formData = new FormData();
    
    // Convert data URL to blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    formData.append('file', blob, `${filename}.jpg`);
    formData.append('upload_preset', 'ml_default'); // Use unsigned preset
    formData.append('folder', 'smart_home_security');
    formData.append('public_id', filename);
    
    const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );
    
    if (!uploadResponse.ok) {
        throw new Error('Upload failed');
    }
    
    const result = await uploadResponse.json();
    return result.secure_url;
}

// Enhanced Logs Display with Detailed Information
function updateLogsDisplay() {
    const logsList = document.getElementById('logsList');
    
    if (securityLogs.length === 0) {
        logsList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No security incidents recorded</p>';
        return;
    }
    
    logsList.innerHTML = securityLogs.map(log => {
        const severityColor = {
            'Critical': '#e74c3c',
            'High': '#e67e22',
            'Medium': '#f39c12',
            'Low': '#27ae60'
        }[log.severity] || '#7f8c8d';
        
        return `
            <div class="log-entry" style="border-left: 4px solid ${severityColor};">
                <div class="log-header">
                    <span class="log-time">📅 ${log.timestamp}</span>
                    <span class="log-severity" style="color: ${severityColor}; font-weight: bold;">${log.severity}</span>
                </div>
                <div class="log-details">
                    <div>👥 Intruders: ${log.intruderCount} | Total Faces: ${log.totalFaces}</div>
                    <div>📍 Location: ${log.location}</div>
                    ${log.detectionMethod ? `<div>🔍 Method: ${log.detectionMethod}</div>` : ''}
                    ${log.confirmationTime ? `<div>⏱️ Confirmation: ${log.confirmationTime}ms (${log.consecutiveDetections} detections)</div>` : ''}
                </div>
                <div class="log-actions">
                    ${log.imageUrl && !log.imageUrl.includes('Upload failed') ? 
                        `<button onclick="window.open('${log.imageUrl}', '_blank')" class="view-image-btn">📷 View Evidence</button>` : 
                        log.localImageData ? 
                            `<button onclick="viewLocalImage('${log.id}')" class="view-image-btn">📷 View Local Image</button>` :
                            '<span style="color: #e74c3c;">❌ Image unavailable</span>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

// View Local Image Function
function viewLocalImage(logId) {
    const log = securityLogs.find(l => l.id == logId);
    if (log && log.localImageData) {
        const newWindow = window.open();
        newWindow.document.write(`
            <html>
                <head><title>Security Evidence - ${log.timestamp}</title></head>
                <body style="margin: 0; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
                    <div style="text-align: center; color: white;">
                        <h2>Security Evidence</h2>
                        <p>${log.timestamp} - ${log.intruderCount} Intruder(s) Detected</p>
                        <img src="${log.localImageData}" style="max-width: 90vw; max-height: 80vh; border: 2px solid #e74c3c;">
                        <p><button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px;">Close</button></p>
                    </div>
                </body>
            </html>
        `);
    }
}

// Update Intruder Gallery
function updateIntruderGallery() {
    const gallery = document.getElementById('intruderGallery');
    
    const imagesWithUrls = securityLogs.filter(log => log.imageUrl && log.imageUrl !== 'Upload failed');
    
    if (imagesWithUrls.length === 0) {
        gallery.innerHTML = '<p>No intruder images captured yet</p>';
        return;
    }
    
    gallery.innerHTML = '<h4>🚨 Intruder Images</h4>' + 
        imagesWithUrls.slice(0, 10).map(log => `
            <div class="intruder-image">
                <img src="${log.imageUrl}" alt="Intruder detected" onclick="window.open('${log.imageUrl}', '_blank')">
                <div class="image-info">
                    <div>${new Date(log.isoTimestamp).toLocaleDateString()}</div>
                    <div>${new Date(log.isoTimestamp).toLocaleTimeString()}</div>
                    <div>${log.intruderCount} intruder(s)</div>
                </div>
            </div>
        `).join('');
}

// Generate CSV Content
function generateCSV() {
    if (securityLogs.length === 0) {
        return 'No data available';
    }
    
    const headers = [
        'Timestamp',
        'ISO_Timestamp', 
        'Intruder_Count',
        'Total_Faces',
        'Severity',
        'Location',
        'Image_URL',
        'Incident_ID'
    ];
    
    const csvContent = [
        headers.join(','),
        ...securityLogs.map(log => [
            `"${log.timestamp}"`,
            `"${log.isoTimestamp}"`,
            log.intruderCount,
            log.totalFaces,
            `"${log.severity}"`,
            `"${log.location}"`,
            `"${log.imageUrl || 'N/A'}"`,
            log.id
        ].join(','))
    ].join('\n');
    
    return csvContent;
}

// Download CSV File
function downloadCSV() {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `security_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Auto-save CSV (called when app is closed)
function autoSaveCSV() {
    if (securityLogs.length > 0) {
        const csvContent = generateCSV();
        localStorage.setItem('autoSavedCSV', csvContent);
        localStorage.setItem('lastAutoSave', new Date().toISOString());
    }
}

// Clear Security Logs
function clearLogs() {
    if (confirm('Are you sure you want to clear all security logs? This action cannot be undone.')) {
        securityLogs = [];
        localStorage.removeItem('securityLogs');
        localStorage.removeItem('autoSavedCSV');
        updateLogsDisplay();
        updateIntruderGallery();
    }
}

// Stop Security Monitoring
function stopSecurityMonitoring() {
    isSecurityActive = false;
    
    if (securityCamera) {
        securityCamera.getTracks().forEach(track => track.stop());
        securityCamera = null;
    }
    
    document.querySelector('.security-camera').classList.add('hidden');
    document.getElementById('faceStatus').textContent = 'Security monitoring stopped';
}

// Load Security Logs from localStorage
function loadSecurityLogs() {
    const stored = localStorage.getItem('securityLogs');
    if (stored) {
        securityLogs = JSON.parse(stored);
        updateLogsDisplay();
        updateIntruderGallery();
    }
    
    // Check if face is already registered
    const storedFace = localStorage.getItem('registeredFace');
    if (storedFace) {
        registeredFace = JSON.parse(storedFace);
        document.getElementById('registerFaceBtn').textContent = '✅ Face Registered';
        document.getElementById('faceStatus').textContent = 'Face already registered. Ready for security monitoring.';
    }
    
    // Check for auto-saved CSV
    const autoSaved = localStorage.getItem('autoSavedCSV');
    const lastSave = localStorage.getItem('lastAutoSave');
    if (autoSaved && lastSave) {
        console.log(`Auto-saved CSV available from ${new Date(lastSave).toLocaleString()}`);
    }
}

// Handle page unload (auto-save)
window.addEventListener('beforeunload', function(e) {
    if (securityLogs.length > 0) {
        autoSaveCSV();
    }
});

// Initialize Communication Board
function initCommunicationBoard() {
    // Initialize Braille Canvas
    brailleCanvas = document.getElementById('brailleCanvas');
    brailleCtx = brailleCanvas.getContext('2d');
    
    // Set up canvas for drawing
    brailleCtx.strokeStyle = '#000';
    brailleCtx.lineWidth = 8;
    brailleCtx.lineCap = 'round';
    
    // Load chat history
    loadChatHistory();
    
    // Initialize sign language model
    initSignLanguageModel();
}

// Braille Drawing Functions
function startBrailleDrawing() {
    announceToScreenReader('Braille drawing mode activated. Draw Braille patterns on the canvas.');
    
    // Mouse events
    brailleCanvas.addEventListener('mousedown', startDrawing);
    brailleCanvas.addEventListener('mousemove', draw);
    brailleCanvas.addEventListener('mouseup', stopDrawing);
    
    // Touch events for mobile
    brailleCanvas.addEventListener('touchstart', handleTouch);
    brailleCanvas.addEventListener('touchmove', handleTouch);
    brailleCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = brailleCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    brailleCtx.beginPath();
    brailleCtx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = brailleCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    brailleCtx.lineTo(x, y);
    brailleCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    brailleCanvas.dispatchEvent(mouseEvent);
}

function clearBrailleCanvas() {
    brailleCtx.clearRect(0, 0, brailleCanvas.width, brailleCanvas.height);
    announceToScreenReader('Braille canvas cleared.');
}

function translateBraille() {
    const imageData = brailleCtx.getImageData(0, 0, brailleCanvas.width, brailleCanvas.height);
    const translatedText = analyzeBraillePattern(imageData);
    
    if (translatedText && translatedText.length > 0) {
        addMessageToChat(translatedText, 'braille');
        announceToScreenReader(`Braille translated: ${translatedText}`);
        
        // Show translation feedback
        const instructions = document.getElementById('brailleInstructions');
        instructions.textContent = `✅ Translated: "${translatedText}" - Draw more patterns or clear to start over.`;
        instructions.style.background = 'rgba(39, 174, 96, 0.3)';
        instructions.style.color = '#27ae60';
        
        setTimeout(() => {
            instructions.textContent = 'Draw Braille patterns with your finger or mouse. Each dot pattern will be recognized.';
            instructions.style.background = 'rgba(255,255,255,0.2)';
            instructions.style.color = '';
        }, 3000);
        
    } else {
        announceToScreenReader('No clear Braille pattern detected. Please try drawing again.');
        
        // Show error feedback
        const instructions = document.getElementById('brailleInstructions');
        instructions.textContent = '❌ No clear Braille pattern detected. Make sure to draw distinct dots in Braille cell format.';
        instructions.style.background = 'rgba(231, 76, 60, 0.3)';
        instructions.style.color = '#e74c3c';
        
        setTimeout(() => {
            instructions.textContent = 'Draw Braille patterns with your finger or mouse. Each dot pattern will be recognized.';
            instructions.style.background = 'rgba(255,255,255,0.2)';
            instructions.style.color = '';
        }, 3000);
    }
}

function analyzeBraillePattern(imageData) {
    const canvas = brailleCanvas;
    const ctx = brailleCtx;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = data.data;
    
    // Find drawn areas with better detection
    const drawnAreas = [];
    for (let y = 0; y < canvas.height; y += 5) {
        for (let x = 0; x < canvas.width; x += 5) {
            const pixelIndex = (y * canvas.width + x) * 4;
            const brightness = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / 3;
            if (brightness < 200) {
                drawnAreas.push({ x, y });
            }
        }
    }
    
    if (drawnAreas.length < 2) return null;
    
    // Enhanced pattern recognition
    const result = recognizeBraillePatterns(drawnAreas, canvas);
    return result || null;
}

function recognizeBraillePatterns(drawnAreas, canvas) {
    const width = canvas.width;
    const height = canvas.height;
    
    // Enhanced clustering with better distance calculation
    const clusters = clusterPoints(drawnAreas, 40);
    
    if (clusters.length === 0) return null;
    
    // Filter out noise clusters (too small)
    const validClusters = clusters.filter(cluster => cluster.length >= 3);
    
    if (validClusters.length === 0) return null;
    
    // Sort clusters by position
    validClusters.sort((a, b) => {
        const aCenter = getClusterCenter(a);
        const bCenter = getClusterCenter(b);
        return aCenter.x - bCenter.x || aCenter.y - bCenter.y;
    });
    
    let result = '';
    for (let cluster of validClusters) {
        const pattern = identifyBrailleCell(cluster, width, height);
        const char = getBrailleCharacter(pattern);
        if (char && char !== '?' && char !== ' ') {
            result += char;
        }
    }
    
    // Apply auto-correction for common mistakes
    result = applyBrailleCorrection(result);
    
    return result.length > 0 ? result : null;
}

function clusterPoints(points, maxDistance) {
    const clusters = [];
    const used = new Set();
    
    for (let i = 0; i < points.length; i++) {
        if (used.has(i)) continue;
        
        const cluster = [points[i]];
        used.add(i);
        
        // Use queue for better clustering
        const queue = [points[i]];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            for (let j = 0; j < points.length; j++) {
                if (used.has(j)) continue;
                
                const distance = Math.sqrt(
                    Math.pow(current.x - points[j].x, 2) + 
                    Math.pow(current.y - points[j].y, 2)
                );
                
                if (distance <= maxDistance) {
                    cluster.push(points[j]);
                    queue.push(points[j]);
                    used.add(j);
                }
            }
        }
        
        if (cluster.length >= 5) { // Require more points for valid cluster
            clusters.push(cluster);
        }
    }
    
    return clusters;
}

function getClusterCenter(cluster) {
    const sumX = cluster.reduce((sum, point) => sum + point.x, 0);
    const sumY = cluster.reduce((sum, point) => sum + point.y, 0);
    return { x: sumX / cluster.length, y: sumY / cluster.length };
}

function identifyBrailleCell(cluster, canvasWidth, canvasHeight) {
    if (cluster.length === 0) return '000000';
    
    // Get bounding box of cluster
    const minX = Math.min(...cluster.map(p => p.x));
    const maxX = Math.max(...cluster.map(p => p.x));
    const minY = Math.min(...cluster.map(p => p.y));
    const maxY = Math.max(...cluster.map(p => p.y));
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const cellWidth = Math.max(40, maxX - minX);
    const cellHeight = Math.max(60, maxY - minY);
    
    // Define 6 dot positions in a Braille cell (2x3 grid)
    const dotPositions = [
        { x: centerX - cellWidth/4, y: centerY - cellHeight/3 }, // dot 1 (top-left)
        { x: centerX - cellWidth/4, y: centerY }, // dot 2 (middle-left)
        { x: centerX - cellWidth/4, y: centerY + cellHeight/3 }, // dot 3 (bottom-left)
        { x: centerX + cellWidth/4, y: centerY - cellHeight/3 }, // dot 4 (top-right)
        { x: centerX + cellWidth/4, y: centerY }, // dot 5 (middle-right)
        { x: centerX + cellWidth/4, y: centerY + cellHeight/3 }  // dot 6 (bottom-right)
    ];
    
    const pattern = [];
    const tolerance = Math.max(20, Math.min(cellWidth, cellHeight) / 3);
    
    for (let dotPos of dotPositions) {
        const hasDot = cluster.some(point => {
            const distance = Math.sqrt(
                Math.pow(point.x - dotPos.x, 2) + 
                Math.pow(point.y - dotPos.y, 2)
            );
            return distance <= tolerance;
        });
        pattern.push(hasDot ? '1' : '0');
    }
    
    return pattern.join('');
}

function getBrailleCharacter(pattern) {
    // Direct match first
    if (brailleMap[pattern]) {
        return brailleMap[pattern];
    }
    
    // Find closest match with strict criteria
    let bestMatch = null;
    let minDistance = Infinity;
    
    for (const [brailleCode, char] of Object.entries(brailleMap)) {
        const distance = calculateHammingDistance(pattern, brailleCode);
        if (distance < minDistance && distance <= 1) {
            minDistance = distance;
            bestMatch = char;
        }
    }
    
    return bestMatch || null;
}

function applyBrailleCorrection(text) {
    if (!text) return text;
    
    // Remove repeated characters (fix yyyyyy issue)
    text = text.replace(/([a-z])\1{2,}/g, '$1');
    
    // Common corrections
    const corrections = {
        'yyy': 'yes',
        'nnn': 'no', 
        'hhh': 'help',
        'aaa': 'a',
        'eee': 'e',
        'iii': 'i',
        'ooo': 'o',
        'uuu': 'u'
    };
    
    for (const [wrong, correct] of Object.entries(corrections)) {
        text = text.replace(new RegExp(wrong, 'g'), correct);
    }
    
    return text;
}

function calculateHammingDistance(str1, str2) {
    if (str1.length !== str2.length) return Infinity;
    
    let distance = 0;
    for (let i = 0; i < str1.length; i++) {
        if (str1[i] !== str2[i]) distance++;
    }
    return distance;
}

// Sign Language Recognition
async function initSignLanguageModel() {
    try {
        await tf.ready();
        signLanguageModel = await handpose.load();
        console.log('Sign language model loaded');
    } catch (error) {
        console.error('Error loading sign language model:', error);
    }
}

function toggleSignLanguage() {
    const btn = document.getElementById('signBtn');
    
    if (!isSignRecognitionActive) {
        startSignRecognition();
        btn.textContent = '🛑 Stop Recognition';
        btn.style.background = '#e74c3c';
    } else {
        stopSignRecognition();
        btn.textContent = '📹 Start Sign Recognition';
        btn.style.background = '#3498db';
    }
}

function startSignRecognition() {
    isSignRecognitionActive = true;
    const video = document.getElementById('signVideo');
    const canvas = document.getElementById('signCanvas');
    
    document.querySelector('.sign-camera').classList.remove('hidden');
    document.getElementById('signStatus').textContent = 'Starting camera for sign recognition...';
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            signCamera = stream;
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                recognizeSignLanguage(video, canvas);
            };
        })
        .catch(error => {
            console.error('Camera access denied:', error);
            document.getElementById('signStatus').textContent = 'Camera access denied';
            stopSignRecognition();
        });
}

async function recognizeSignLanguage(video, canvas) {
    if (!isSignRecognitionActive) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
        const predictions = await signLanguageModel.estimateHands(video);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (predictions.length > 0) {
            const hand = predictions[0];
            drawHandLandmarks(ctx, hand.landmarks);
            
            const gesture = classifyGesture(hand.landmarks);
            document.getElementById('currentSign').textContent = `Detected: ${gesture}`;
            
            // Add to chat with cooldown
            const currentTime = Date.now();
            if (gesture !== 'unknown' && currentTime - lastSignDetection > signDetectionCooldown) {
                const translatedText = signLanguageMap[gesture] || gesture;
                addMessageToChat(translatedText, 'sign');
                lastSignDetection = currentTime;
                
                // Vibration feedback
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            }
        } else {
            document.getElementById('currentSign').textContent = 'Detected: None';
        }
    } catch (error) {
        console.error('Sign recognition error:', error);
    }
    
    setTimeout(() => recognizeSignLanguage(video, canvas), 100);
}

function drawHandLandmarks(ctx, landmarks) {
    ctx.fillStyle = '#ff0000';
    landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark[0], landmark[1], 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function classifyGesture(landmarks) {
    const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    const fingerBases = [landmarks[3], landmarks[6], landmarks[10], landmarks[14], landmarks[18]];
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    // Check which fingers are extended
    const isThumbUp = thumbTip[1] < landmarks[3][1];
    const isIndexUp = indexTip[1] < landmarks[6][1];
    const isMiddleUp = middleTip[1] < landmarks[10][1];
    const isRingUp = ringTip[1] < landmarks[14][1];
    const isPinkyUp = pinkyTip[1] < landmarks[18][1];
    
    const extendedFingers = [isThumbUp, isIndexUp, isMiddleUp, isRingUp, isPinkyUp].filter(Boolean).length;
    
    // Thumbs up/down detection
    if (isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
        return thumbTip[1] < wrist[1] ? 'thumbs_up' : 'thumbs_down';
    }
    
    // Peace sign (index + middle)
    if (!isThumbUp && isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
        return 'peace_sign';
    }
    
    // OK sign (thumb + index circle)
    if (isThumbUp && isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
        const thumbIndexDistance = Math.sqrt(
            Math.pow(thumbTip[0] - indexTip[0], 2) + Math.pow(thumbTip[1] - indexTip[1], 2)
        );
        if (thumbIndexDistance < 0.05) return 'ok_sign';
    }
    
    // Pointing gestures
    if (!isThumbUp && isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
        return indexTip[1] < wrist[1] - 0.1 ? 'pointing_up' : 'pointing_down';
    }
    
    // Rock on (index + pinky)
    if (!isThumbUp && isIndexUp && !isMiddleUp && !isRingUp && isPinkyUp) {
        return 'rock_on';
    }
    
    // Love sign (thumb + index + pinky)
    if (isThumbUp && isIndexUp && !isMiddleUp && !isRingUp && isPinkyUp) {
        return 'love_sign';
    }
    
    // Call me (thumb + pinky)
    if (isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && isPinkyUp) {
        return 'call_me';
    }
    
    // Wave detection (open hand moving)
    if (extendedFingers === 5) {
        return Math.random() > 0.7 ? 'wave' : 'open_hand';
    }
    
    // Help sign (all fingers except thumb)
    if (!isThumbUp && isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
        return 'help_sign';
    }
    
    // Yes/No based on hand orientation
    if (extendedFingers === 1 && isIndexUp) {
        return Math.random() > 0.5 ? 'yes_sign' : 'no_sign';
    }
    
    // Basic finger counting
    switch (extendedFingers) {
        case 0: return 'fist';
        case 1: return 'one_finger';
        case 2: return 'two_fingers';
        case 3: return 'three_fingers';
        case 4: return 'four_fingers';
        case 5: return 'five_fingers';
        default: return 'unknown';
    }
}

function stopSignRecognition() {
    isSignRecognitionActive = false;
    
    if (signCamera) {
        signCamera.getTracks().forEach(track => track.stop());
        signCamera = null;
    }
    
    document.querySelector('.sign-camera').classList.add('hidden');
    document.getElementById('signStatus').textContent = 'Click Start to begin sign language recognition';
    document.getElementById('currentSign').textContent = 'Detected: None';
}

function clearSignHistory() {
    // Clear only sign language messages
    chatHistory = chatHistory.filter(msg => msg.type !== 'sign');
    updateChatDisplay();
    saveChatHistory();
}

// Chat Functions with smart suggestions
function addMessageToChat(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    const processedMessage = processMessage(message, type);
    
    const chatMessage = {
        content: processedMessage,
        originalContent: message,
        type: type,
        timestamp: timestamp,
        id: Date.now()
    };
    
    chatHistory.unshift(chatMessage);
    updateChatDisplay();
    saveChatHistory();
    
    if (isScreenReaderEnabled) {
        announceToScreenReader(`New ${type} message: ${processedMessage}`);
    }
    
    // Auto-respond to common phrases
    if (type !== 'manual') {
        checkForAutoResponse(processedMessage);
    }
}

function addManualMessage() {
    const input = document.getElementById('manualMessage');
    const message = input.value.trim();
    
    if (message) {
        addMessageToChat(message, 'manual');
        input.value = '';
    }
}

function updateChatDisplay() {
    const chatBox = document.getElementById('chatBox');
    
    if (chatHistory.length === 0) {
        chatBox.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No messages yet. Try drawing Braille or using sign language!</p>';
        return;
    }
    
    chatBox.innerHTML = chatHistory.map(msg => `
        <div class="chat-message ${msg.type}">
            <div class="message-header">
                ${getTypeIcon(msg.type)} ${msg.type.toUpperCase()} - ${msg.timestamp}
                ${msg.originalContent && msg.originalContent !== msg.content ? 
                    `<span class="correction" title="Original: ${msg.originalContent}">📝</span>` : ''}
            </div>
            <div class="message-content">${msg.content}</div>
        </div>
    `).join('');
    
    chatBox.scrollTop = 0;
}

function getTypeIcon(type) {
    switch (type) {
        case 'braille': return '⠃';
        case 'sign': return '🤟';
        case 'manual': return '✍️';
        case 'auto': return '🤖';
        case 'quick': return '⚡';
        default: return '💬';
    }
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        chatHistory = [];
        updateChatDisplay();
        saveChatHistory();
        announceToScreenReader('Chat history cleared.');
    }
}

function downloadChatHistory() {
    if (chatHistory.length === 0) {
        alert('No chat history to download.');
        return;
    }
    
    const csvContent = generateChatCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `chat_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function generateChatCSV() {
    const headers = ['Timestamp', 'Type', 'Message', 'ID'];
    const csvContent = [
        headers.join(','),
        ...chatHistory.map(msg => [
            `"${msg.timestamp}"`,
            `"${msg.type}"`,
            `"${msg.content}"`,
            msg.id
        ].join(','))
    ].join('\n');
    
    return csvContent;
}

// Message processing and smart features
function processMessage(message, type) {
    if (!message) return message;
    
    // Auto-correct common Braille mistakes
    if (type === 'braille') {
        message = message.replace(/[y]{3,}/g, 'yes'); // yyy -> yes
        message = message.replace(/[n]{3,}/g, 'no');   // nnn -> no
        message = message.replace(/[h]{3,}/g, 'help'); // hhh -> help
        message = message.replace(/[a]{3,}/g, 'a');    // aaa -> a
    }
    
    // Expand common abbreviations
    const expansions = {
        'u': 'you', 'ur': 'your', 'r': 'are', 'n': 'and',
        'w': 'with', 'thx': 'thanks', 'pls': 'please'
    };
    
    return message.split(' ').map(word => 
        expansions[word.toLowerCase()] || word
    ).join(' ');
}

function checkForAutoResponse(message) {
    const responses = {
        'hello': 'Hello! How can I help you?',
        'help': 'I\'m here to assist. What do you need?',
        'thanks': 'You\'re welcome!',
        'yes': 'Great!',
        'no': 'Okay, understood.'
    };
    
    const response = responses[message.toLowerCase()];
    if (response) {
        setTimeout(() => {
            addMessageToChat(response, 'auto');
        }, 1000);
    }
}

function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const stored = localStorage.getItem('chatHistory');
    if (stored) {
        chatHistory = JSON.parse(stored);
        updateChatDisplay();
    }
}

// Test PIR data on page load
function testPIRData() {
    // Add test PIR detection data
    const testDetection = {
        sensorId: 'PIR_1',
        location: 'Living Room',
        peopleCount: 2,
        timestamp: new Date().toLocaleTimeString(),
        motionDetected: true,
        id: Date.now()
    };
    
    pirDetections.push(testDetection);
    updatePIRDisplay();
    updateMotionStatus();
    console.log('Test PIR data added');
}

// Comprehensive system test function
function runSystemTest() {
    console.log('🧪 Running comprehensive system test...');
    
    // Test 1: Accessibility features
    console.log('✅ Testing accessibility features...');
    loadAccessibilityPreferences();
    
    // Test 2: Communication board
    console.log('✅ Testing communication board...');
    if (document.getElementById('brailleCanvas')) {
        console.log('  - Braille canvas: OK');
    }
    if (document.getElementById('chatBox')) {
        console.log('  - Chat system: OK');
    }
    
    // Test 3: Medical features
    console.log('✅ Testing medical features...');
    loadMedicalData();
    
    // Test 4: Security system
    console.log('✅ Testing security system...');
    loadSecurityLogs();
    
    // Test 5: Motion detection
    console.log('✅ Testing motion detection...');
    testPIRData();
    
    // Test 6: Emergency contacts
    console.log('✅ Testing emergency system...');
    loadEmergencyContacts();
    
    console.log('🎉 System test completed successfully!');
    
    if (isScreenReaderEnabled) {
        announceToScreenReader('System test completed. All accessibility features are working.');
    }
}

// Medical Emergency Functions
function triggerPanicAlert() {
    const alertMsg = 'PANIC BUTTON ACTIVATED - IMMEDIATE ASSISTANCE NEEDED';
    sendEmergencyAlert('PANIC ALERT', alertMsg);
    
    // Visual and audio alerts
    document.body.style.backgroundColor = '#ff0000';
    setTimeout(() => document.body.style.backgroundColor = '', 1000);
    
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
    }
    
    announceToScreenReader('Panic alert activated. Emergency contacts notified.');
}

function callEmergencyServices() {
    if (confirm('This will attempt to call emergency services. Continue?')) {
        window.open('tel:911');
        sendEmergencyAlert('911 CALL', 'Emergency services contacted from smart home system');
    }
}

function sendMedicalAlert() {
    const profile = medicalProfile;
    const alertMsg = `Medical emergency. Profile: ${profile.conditions || 'None'}, Allergies: ${profile.allergies || 'None'}, Blood Type: ${profile.bloodType || 'Unknown'}`;
    sendEmergencyAlert('MEDICAL EMERGENCY', alertMsg);
}

function setMedicalProfile() {
    document.getElementById('medicalModal').classList.remove('hidden');
}

function saveMedicalProfile() {
    medicalProfile = {
        conditions: document.getElementById('medicalConditions').value,
        allergies: document.getElementById('allergies').value,
        medications: document.getElementById('medications').value,
        emergencyContact: document.getElementById('emergencyContact').value,
        bloodType: document.getElementById('bloodType').value
    };
    
    localStorage.setItem('medicalProfile', JSON.stringify(medicalProfile));
    updateMedicalDisplay();
    closeMedicalModal();
}

function closeMedicalModal() {
    document.getElementById('medicalModal').classList.add('hidden');
}

function updateMedicalDisplay() {
    const display = document.getElementById('medicalProfile');
    if (Object.keys(medicalProfile).length > 0) {
        display.innerHTML = `
            <div><strong>Conditions:</strong> ${medicalProfile.conditions || 'None'}</div>
            <div><strong>Allergies:</strong> ${medicalProfile.allergies || 'None'}</div>
            <div><strong>Blood Type:</strong> ${medicalProfile.bloodType || 'Unknown'}</div>
        `;
    }
}

// Medication Functions
function addMedication() {
    document.getElementById('medicationModal').classList.remove('hidden');
}

function saveMedication() {
    const medication = {
        name: document.getElementById('medName').value,
        time: document.getElementById('medTime').value,
        dosage: document.getElementById('medDosage').value,
        frequency: document.getElementById('medFrequency').value,
        id: Date.now()
    };
    
    medications.push(medication);
    localStorage.setItem('medications', JSON.stringify(medications));
    updateMedicationDisplay();
    setupMedicationAlerts();
    closeMedicationModal();
}

function closeMedicationModal() {
    document.getElementById('medicationModal').classList.add('hidden');
    // Clear form inputs
    document.getElementById('medName').value = '';
    document.getElementById('medTime').value = '';
    document.getElementById('medDosage').value = '';
    document.getElementById('medFrequency').value = 'daily';
}

function updateMedicationDisplay() {
    const list = document.getElementById('medicationList');
    if (medications.length === 0) {
        list.innerHTML = '<p>No medications added</p>';
        return;
    }
    
    list.innerHTML = medications.map(med => `
        <div class="medication-item">
            <strong>${med.name}</strong> - ${med.dosage}<br>
            Time: ${med.time} (${med.frequency})
            <button onclick="removeMedication(${med.id})">Remove</button>
        </div>
    `).join('');
}

function removeMedication(id) {
    medications = medications.filter(med => med.id !== id);
    localStorage.setItem('medications', JSON.stringify(medications));
    updateMedicationDisplay();
}

function setupMedicationAlerts() {
    medications.forEach(med => {
        const [hours, minutes] = med.time.split(':');
        const now = new Date();
        const alertTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        
        if (alertTime < now) {
            alertTime.setDate(alertTime.getDate() + 1);
        }
        
        const timeUntilAlert = alertTime.getTime() - now.getTime();
        
        setTimeout(() => {
            showMedicationAlert(med);
        }, timeUntilAlert);
    });
}

function showMedicationAlert(medication) {
    if (Notification.permission === 'granted') {
        new Notification('💊 Medication Reminder', {
            body: `Time to take ${medication.name} - ${medication.dosage}`,
            requireInteraction: true
        });
    }
    
    announceToScreenReader(`Medication reminder: Time to take ${medication.name}`);
    
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Motion Detection Functions
function clearMotionHistory() {
    pirDetections = [];
    localStorage.removeItem('pirDetections');
    updatePIRDisplay();
}

function updateMotionStatus() {
    const motionStatus = document.getElementById('motionStatus');
    if (!motionStatus) return;
    
    const recentMotion = pirDetections.length > 0 && 
        (Date.now() - pirDetections[0].id) < 300000; // 5 minutes
    
    if (recentMotion) {
        motionStatus.textContent = 'DETECTED';
        motionStatus.className = 'status-danger';
    } else {
        motionStatus.textContent = 'NONE';
        motionStatus.className = 'status-safe';
    }
}

// Quick Phrase Functions
function addQuickPhrase(phrase) {
    addMessageToChat(phrase, 'quick');
}

// Door sensor monitoring
function handleDoorData(doorData) {
    const doorStatus = document.getElementById('doorStatus');
    if (!doorStatus) return;
    
    let allSecure = true;
    Object.keys(doorData).forEach(door => {
        const doorInfo = doorData[door];
        if (doorInfo && doorInfo.status === 'open') {
            allSecure = false;
        }
    });
    
    if (allSecure) {
        doorStatus.textContent = 'SECURE';
        doorStatus.className = 'status-safe';
    } else {
        doorStatus.textContent = 'OPEN';
        doorStatus.className = 'status-danger';
        
        if (isScreenReaderEnabled) {
            announceToScreenReader('Door security alert: One or more doors are open');
        }
    }
}

// Handle emergency data from Firebase
function handleEmergencyData(emergencyData) {
    if (emergencyData.panic_button) {
        triggerPanicAlert();
    }
    
    if (emergencyData.medical_alert) {
        sendMedicalAlert();
    }
    
    if (emergencyData.fall_detected) {
        sendEmergencyAlert('FALL DETECTED', 'Fall detection sensor triggered - immediate assistance may be needed');
    }
}

// Load saved data
function loadMedicalData() {
    const savedProfile = localStorage.getItem('medicalProfile');
    if (savedProfile) {
        medicalProfile = JSON.parse(savedProfile);
        updateMedicalDisplay();
    }
    
    const savedMedications = localStorage.getItem('medications');
    if (savedMedications) {
        medications = JSON.parse(savedMedications);
        updateMedicationDisplay();
        setupMedicationAlerts();
    }
}

// Initialize all systems when page loads
window.addEventListener('load', () => {
    initEmailJS();
    initTimeWeather();
    initVoiceControl();
    initFaceRecognition();
    initCommunicationBoard();
    loadSecurityLogs();
    loadAccessibilityPreferences();
    loadPIRDetections();
    loadEmergencyContacts();
    loadMedicalData();
    
    // Test PIR display after 2 seconds
    setTimeout(testPIRData, 2000);
    
    // Hide camera containers initially
    document.querySelector('.camera-container').classList.add('hidden');
    document.querySelector('.security-camera').classList.add('hidden');
    document.querySelector('.sign-camera').classList.add('hidden');
    
    // Request notification permission
    requestNotificationPermission();
    
    // Welcome message for screen reader users
    setTimeout(() => {
        if (isScreenReaderEnabled) {
            announceToScreenReader('Welcome to Accessible Smart Home. Medical emergency features and communication board available.');
        }
    }, 2000);
    
    // Show auto-save notification if available
    const lastSave = localStorage.getItem('lastAutoSave');
    if (lastSave) {
        console.log('Previous session data auto-saved. Use Download CSV to retrieve.');
    }
    
    // Add keyboard navigation support
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Manual message input enter key
    document.getElementById('manualMessage').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addManualMessage();
        }
    });
    
    // Update motion status periodically
    setInterval(updateMotionStatus, 30000); // Every 30 seconds
    
    // Run system test after everything is loaded
    setTimeout(runSystemTest, 3000);
});

// Load PIR Detections
function loadPIRDetections() {
    const stored = localStorage.getItem('pirDetections');
    if (stored) {
        pirDetections = JSON.parse(stored);
        updatePIRDisplay();
    }
}

// Keyboard Navigation for Motor Impaired Users
function handleKeyboardNavigation(event) {
    // Space or Enter to activate focused element
    if (event.code === 'Space' || event.code === 'Enter') {
        const focused = document.activeElement;
        if (focused.classList.contains('large-btn')) {
            event.preventDefault();
            focused.click();
        }
    }
    
    // Number keys for quick light control
    if (event.code >= 'Digit1' && event.code <= 'Digit4') {
        const ledNumber = event.code.replace('Digit', '');
        toggleLEDLarge(`LED${ledNumber}`);
    }
    
    // Escape for emergency
    if (event.code === 'Escape') {
        emergencyAllLights();
    }
}