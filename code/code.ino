#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <math.h>

//////////////////////////////
// WIFI CONFIG
//////////////////////////////
const char* WIFI_SSID = "Abhishek Giri";
const char* WIFI_PASS = "123456789";

//////////////////////////////
// FIREBASE CONFIG
//////////////////////////////
const char* FIREBASE_HOST =
  "smartassist-home-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* FIREBASE_AUTH = ""; // empty if rules are open

//////////////////////////////
// PIN CONFIG
//////////////////////////////
#define SDA_PIN 21
#define SCL_PIN 22
#define LED_PIN 2
#define BUZZER_PIN 26

//////////////////////////////
// MPU6050 CONFIG
//////////////////////////////
const uint8_t MPU_ADDR = 0x68;
const uint8_t PWR_MGMT_1 = 0x6B;
const uint8_t ACCEL_XOUT_H = 0x3B;
const float ACCEL_SCALE = 16384.0;

//////////////////////////////
// FALL DETECTION CONFIG
//////////////////////////////
const float FALL_SPIKE_G = 2.5;
const float LOW_MOTION_G = 0.3;
const unsigned long FALL_CONFIRM_MS = 1500;

bool potentialFall = false;
bool fallDetected = false;
unsigned long fallSpikeTs = 0;

float ax, ay, az;

//////////////////////////////
// FIREBASE LED POLLING
//////////////////////////////
unsigned long lastFirebaseCheck = 0;
const unsigned long FIREBASE_INTERVAL = 2000;
int lastLedState = -1;

WiFiClientSecure client;

//////////////////////////////
// FUNCTION DECLARATIONS
//////////////////////////////
void connectWiFi();
bool readMPU6050(float &ax, float &ay, float &az);
void beepAlert();
int readLEDFromFirebase();
void updateLEDToFirebase(int state);
void firebaseUpdateFall(bool detected);

//////////////////////////////
// SETUP
//////////////////////////////
void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // I2C Init
  Wire.begin(SDA_PIN, SCL_PIN);

  // Wake MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(PWR_MGMT_1);
  Wire.write(0);
  Wire.endTransmission();

  Serial.println("✅ MPU6050 Initialized");

  connectWiFi();
  client.setInsecure(); // demo purpose only
}

//////////////////////////////
// LOOP
//////////////////////////////
void loop() {
  unsigned long now = millis();

  // 🔘 Firebase LED Control
  if (now - lastFirebaseCheck > FIREBASE_INTERVAL) {
    lastFirebaseCheck = now;

    int state = readLEDFromFirebase();
    if (state != -1) {
      digitalWrite(LED_PIN, state ? HIGH : LOW);
      if (state != lastLedState) {
        updateLEDToFirebase(state);
        lastLedState = state;
      }
    }
  }

  // 🚑 Fall Detection
  if (readMPU6050(ax, ay, az)) {
    float mag = sqrt(ax * ax + ay * ay + az * az);

    // Spike detection
    if (!potentialFall && mag > FALL_SPIKE_G) {
      potentialFall = true;
      fallSpikeTs = now;
      Serial.println("⚠ Fall spike detected");
    }

    // Confirmation window
    if (potentialFall && !fallDetected &&
        (now - fallSpikeTs > FALL_CONFIRM_MS)) {

      float ax2, ay2, az2;
      if (readMPU6050(ax2, ay2, az2)) {
        float mag2 = sqrt(ax2 * ax2 + ay2 * ay2 + az2 * az2);
        if (mag2 < LOW_MOTION_G) {
          fallDetected = true;
          potentialFall = false;
          Serial.println("✅ FALL CONFIRMED");
          digitalWrite(LED_PIN, HIGH);
          beepAlert();
          firebaseUpdateFall(true);
        } else {
          potentialFall = false;
        }
      }
    }

    // Reset alert
    if (fallDetected && (now - fallSpikeTs > 5000)) {
      digitalWrite(LED_PIN, LOW);
      fallDetected = false;
    }
  }

  delay(50);
}

//////////////////////////////
// FUNCTIONS
//////////////////////////////
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");
  Serial.println(WiFi.localIP());
}

bool readMPU6050(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom(MPU_ADDR, (uint8_t)6);
  if (Wire.available() < 6) return false;

  int16_t rawAx = (Wire.read() << 8) | Wire.read();
  int16_t rawAy = (Wire.read() << 8) | Wire.read();
  int16_t rawAz = (Wire.read() << 8) | Wire.read();

  ax = rawAx / ACCEL_SCALE;
  ay = rawAy / ACCEL_SCALE;
  az = rawAz / ACCEL_SCALE;
  return true;
}

void beepAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  }
}

int readLEDFromFirebase() {
  String url = "https://" + String(FIREBASE_HOST)
               + "/Actuators/LEDs/LED1.json";

  HTTPClient https;
  https.begin(client, url);
  int code = https.GET();
  if (code == HTTP_CODE_OK) {
    String payload = https.getString();
    https.end();
    return payload.toInt();
  }
  https.end();
  return -1;
}

void updateLEDToFirebase(int state) {
  String url = "https://" + String(FIREBASE_HOST)
               + "/Actuators/LEDs/LED1.json";

  HTTPClient https;
  https.begin(client, url);
  https.addHeader("Content-Type", "application/json");
  https.PUT(String(state));
  https.end();
}

void firebaseUpdateFall(bool detected) {
  String url = "https://" + String(FIREBASE_HOST)
               + "/GuardianSystem/Fall.json";

  HTTPClient https;
  https.begin(client, url);
  https.addHeader("Content-Type", "application/json");

  String payload =
    String("{\"Detected\":") + (detected ? "true" : "false") +
    String(",\"Timestamp\":") + millis() + "}";

  https.PATCH(payload);
  https.end();
}
