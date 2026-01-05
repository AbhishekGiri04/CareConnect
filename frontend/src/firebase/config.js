// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, analytics, database };
export default app;