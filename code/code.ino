#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Bounce2.h>
#include <FirebaseESP32.h>

const char* ssid = "Code-Catalyst";
const char* password = "smarthome";
#define FIREBASE_HOST "https://smarthomeesp32-saarthi-default-rtdb.firebaseio.com"

WebServer server(80);

// Define LED pins
const int LED1_PIN = 2;
const int LED2_PIN = 15;
const int LED3_PIN = 4;
const int LED4_PIN = 5;

// Define switch pins
#define SwitchPin1 17
#define SwitchPin2 14
#define SwitchPin3 27
#define SwitchPin4 12

// Define PIR sensor pins
#define PIR_GAS_PIN 13        // Gas leak detection
#define PIR_MOTION_PIN 25     // Single PIR for motion detection

FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// PIR motion detection variables
unsigned long lastPIRCheck = 0;
const unsigned long PIR_CHECK_INTERVAL = 3000; // Check every 3 seconds
int lastPeopleCount = 0;

// HTML code stored in PROGMEM
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Smart Home ESP32 Controller</title>
  <script src="https://www.gstatic.com/firebasejs/9.8.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.8.1/firebase-database-compat.js"></script>
</head>
<body>
  <h1>Smart Home Controller</h1>
  <div id="statusLED1">LED1 status: </div>
  <div id="statusLED2">LED2 status: </div>
  <div id="statusLED3">LED3 status: </div>
  <div id="statusLED4">LED4 status: </div>
  <div id="gasStatus">Gas Status: </div>
  <div id="pirStatus">PIR Status: </div>

 <script>
const firebaseConfig = {
  apiKey: "AIzaSyBzajC2xLM4ByLYyMfQHY2ehoiNvjCrpkE",
  authDomain: "smarthomeesp32-saarthi.firebaseapp.com",
  databaseURL: "https://smarthomeesp32-saarthi-default-rtdb.firebaseio.com",
  projectId: "smarthomeesp32-saarthi",
  storageBucket: "smarthomeesp32-saarthi.firebasestorage.app",
  messagingSenderId: "1045726965820",
  appId: "1:1045726965820:web:feb96218879d8b82a49339",
  measurementId: "G-24Y177SXPK"
};
   firebase.initializeApp(firebaseConfig)

  const database = firebase.database()

  function handleSnapshot(snapshot) {
    const data = snapshot.val();
    const led1Status = data.LED1;
    const led2Status = data.LED2;
    const led3Status = data.LED3;
    const led4Status = data.LED4;

    updateLEDStatus("statusLED1", "LED1", led1Status);
    updateLEDStatus("statusLED2", "LED2", led2Status);
    updateLEDStatus("statusLED3", "LED3", led3Status);
    updateLEDStatus("statusLED4", "LED4", led4Status);

    fetch('/updateLEDStatuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        led1Status: led1Status,
        led2Status: led2Status,
        led3Status: led3Status,
        led4Status: led4Status
      })
    })
    .then(response => response.text())
    .then(data => console.log('Response from ESP32:', data))
    .catch(error => console.error('Error:', error));
  }

  function updateLEDStatus(elementId, ledName, status) {
    var statusText = document.getElementById(elementId);
    statusText.textContent = ledName + " is " + (status ? "ON" : "OFF");
  }

  database.ref().on('value', handleSnapshot);
</script>
 
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send(200, "text/html", index_html);
}

// Function to update LED state in Firebase
void updateLED(const char* tag, bool state) {
  int value = state ? 1 : 0;
  if (!Firebase.setInt(firebaseData, tag, value)) {
    Serial.print("Error sending LED data: ");
    Serial.println(firebaseData.errorReason());
  }
}

// Function to update PIR data in Firebase
void updatePIRData(int peopleCount) {
  String path = "PIR_SENSORS/PIR_1";
  
  // Get current time
  String timestamp = getFormattedTime();
  
  // Update people count
  if (!Firebase.setInt(firebaseData, (path + "/people_count").c_str(), peopleCount)) {
    Serial.print("Error sending PIR count: ");
    Serial.println(firebaseData.errorReason());
  }
  
  // Update timestamp
  if (!Firebase.setString(firebaseData, (path + "/timestamp").c_str(), timestamp)) {
    Serial.print("Error sending PIR timestamp: ");
    Serial.println(firebaseData.errorReason());
  }
  
  Serial.println("PIR Motion: " + String(peopleCount) + " people detected at " + timestamp);
}

// Get formatted time string
String getFormattedTime() {
  unsigned long currentTime = millis();
  int hours = (currentTime / 3600000) % 24;
  int minutes = (currentTime / 60000) % 60;
  int seconds = (currentTime / 1000) % 60;
  
  String timeStr = "";
  if (hours < 10) timeStr += "0";
  timeStr += String(hours) + ":";
  if (minutes < 10) timeStr += "0";
  timeStr += String(minutes) + ":";
  if (seconds < 10) timeStr += "0";
  timeStr += String(seconds);
  
  return timeStr;
}

// Simulate people counting for single PIR sensor
int countPeople() {
  bool motionDetected = digitalRead(PIR_MOTION_PIN);
  
  if (motionDetected) {
    // Simple people counting simulation
    return random(1, 4); // 1-3 people
  }
  
  return 0;
}

Bounce debouncer1 = Bounce();
Bounce debouncer2 = Bounce();
Bounce debouncer3 = Bounce();
Bounce debouncer4 = Bounce();

void handleButtonEvent(Bounce* button, int ledPin, const char* firebaseTag, bool& ledState) {
  if (button->fell() || button->rose()) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState ? HIGH : LOW);
    updateLED(firebaseTag, ledState);
  }
}

void handleUpdateLEDStatuses() {
  if (server.hasArg("plain")) {
    String body = server.arg("plain");

    DynamicJsonDocument doc(200);
    DeserializationError error = deserializeJson(doc, body);

    if (!error) {
      int led1Status = doc["led1Status"];
      int led2Status = doc["led2Status"];
      int led3Status = doc["led3Status"];
      int led4Status = doc["led4Status"];

      digitalWrite(LED1_PIN, led1Status ? HIGH : LOW);
      digitalWrite(LED2_PIN, led2Status ? HIGH : LOW);
      digitalWrite(LED3_PIN, led3Status ? HIGH : LOW);
      digitalWrite(LED4_PIN, led4Status ? HIGH : LOW);

      Serial.println("LED statuses updated from web");
      server.send(200, "text/plain", "LED statuses received successfully");
    } else {
      server.send(400, "text/plain", "Error parsing JSON data");
    }
  } else {
    server.send(400, "text/plain", "No JSON data received");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to ");
  Serial.print(ssid);

  unsigned long startAttemptTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected to ");
    Serial.println(ssid);
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    server.on("/", handleRoot);
    server.on("/updateLEDStatuses", handleUpdateLEDStatuses);

    // Initialize LED pins
    pinMode(LED1_PIN, OUTPUT);
    pinMode(LED2_PIN, OUTPUT);
    pinMode(LED3_PIN, OUTPUT);
    pinMode(LED4_PIN, OUTPUT);

    // Initialize switch pins
    pinMode(SwitchPin1, INPUT_PULLUP);
    pinMode(SwitchPin2, INPUT_PULLUP);
    pinMode(SwitchPin3, INPUT_PULLUP);
    pinMode(SwitchPin4, INPUT_PULLUP);
    
    // Initialize PIR sensor pins
    pinMode(PIR_GAS_PIN, INPUT);
    pinMode(PIR_MOTION_PIN, INPUT);

    // Set up debouncers
    debouncer1.attach(SwitchPin1);
    debouncer1.interval(20);
    debouncer2.attach(SwitchPin2);
    debouncer2.interval(20);
    debouncer3.attach(SwitchPin3);
    debouncer3.interval(20);
    debouncer4.attach(SwitchPin4);
    debouncer4.interval(20);

    config.host = FIREBASE_HOST;
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Initialize Firebase fields
    Firebase.setInt(firebaseData, "GAS_LEAK", 0);
    
    // Initialize PIR sensor data
    Firebase.setInt(firebaseData, "PIR_SENSORS/PIR_1/people_count", 0);
    Firebase.setString(firebaseData, "PIR_SENSORS/PIR_1/timestamp", "00:00:00");
    
    Serial.println("Firebase initialized with PIR sensor");
    
    server.begin();
  } else {
    Serial.println("Failed to connect to WiFi");
  }
}

void loop() {
  debouncer1.update();
  debouncer2.update();
  debouncer3.update();
  debouncer4.update();

  static bool led1State = LOW;
  static bool led2State = LOW;
  static bool led3State = LOW;
  static bool led4State = LOW;

  // Handle button events
  handleButtonEvent(&debouncer1, LED1_PIN, "LED1", led1State);
  handleButtonEvent(&debouncer2, LED2_PIN, "LED2", led2State);
  handleButtonEvent(&debouncer3, LED3_PIN, "LED3", led3State);
  handleButtonEvent(&debouncer4, LED4_PIN, "LED4", led4State);

  // Check gas leak PIR sensor
  static bool lastGasState = LOW;
  bool currentGasState = digitalRead(PIR_GAS_PIN);
  
  if (currentGasState != lastGasState) {
    if (currentGasState == HIGH) {
      Serial.println("GAS LEAK DETECTED!");
      Firebase.setInt(firebaseData, "GAS_LEAK", 1);
    } else {
      Serial.println("Gas leak cleared");
      Firebase.setInt(firebaseData, "GAS_LEAK", 0);
    }
    lastGasState = currentGasState;
  }

  // Check single PIR motion sensor
  unsigned long currentTime = millis();
  if (currentTime - lastPIRCheck >= PIR_CHECK_INTERVAL) {
    
    int peopleCount = countPeople();
    
    // Update Firebase only if count changed
    if (peopleCount != lastPeopleCount) {
      lastPeopleCount = peopleCount;
      updatePIRData(peopleCount);
    }
    
    lastPIRCheck = currentTime;
  }

  server.handleClient();
}