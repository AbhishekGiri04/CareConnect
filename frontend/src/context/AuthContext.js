import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          role: 'user'
        };
        setUser(userData);
        setToken('firebase-token');
        localStorage.setItem('token', 'firebase-token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    // Demo login for frontend testing
    if (email === 'user@demo.com' && password === 'password123') {
      const mockUser = { 
        id: '1', 
        name: 'John Doe', 
        email: email,
        photoURL: null,
        role: 'user' 
      };
      const mockToken = 'demo-token-123';
      setToken(mockToken);
      setUser(mockUser);
      localStorage.setItem('token', mockToken);
      return { token: mockToken, user: mockUser };
    }
    
    // Handle Google auth users
    if (password === 'google_auth') {
      const mockUser = {
        id: '2',
        name: email.split('@')[0],
        email: email,
        photoURL: null,
        role: 'user'
      };
      const mockToken = 'google-token-123';
      setToken(mockToken);
      setUser(mockUser);
      localStorage.setItem('token', mockToken);
      return { token: mockToken, user: mockUser };
    }
    
    // Real API call (when backend is running)
    try {
      const response = await axios.post('http://localhost:5004/api/auth/login', { email, password });
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase logout error:', error);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    window.location.href = 'http://localhost:3002/';
  };



  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };