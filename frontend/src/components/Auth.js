import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signup(formData.email, formData.password, formData.name);
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
      alert(error.message || 'Authentication failed');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Google auth error:', error);
      alert('Google authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("https://myrealestate.in/storage/2023/03/Collage-Smart-Homes.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className={`auth-wrapper ${isSignUp ? 'panel-active' : ''}`}>
        {/* Sign Up Form */}
        <div className="auth-form-box register-form-box">
          <form onSubmit={handleSubmit}>
            <div className="logo">
              <h2>CareConnect</h2>
            </div>
            <h1>Create Account</h1>
            <div className="social-links">
              <a href="#" onClick={handleGoogleAuth} aria-label="Google">
                <i className="fab fa-google"></i>
              </a>
            </div>
            <span>or use your email for registration</span>
            <input 
              type="text" 
              name="name"
              placeholder="Full Name" 
              value={formData.name}
              onChange={handleInputChange}
              required 
            />
            <input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              value={formData.email}
              onChange={handleInputChange}
              required 
            />
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleInputChange}
              required 
            />
            <button type="submit">Sign Up</button>
            <div className="mobile-switch">
              <p>Already have an account?</p>
              <button type="button" onClick={() => setIsSignUp(false)}>Sign In</button>
            </div>
          </form>
        </div>

        {/* Sign In Form */}
        <div className="auth-form-box login-form-box">
          <form onSubmit={handleSubmit}>
            <div className="logo">
              <h2>CareConnect</h2>
            </div>
            <h1>Sign In</h1>
            <div className="social-links">
              <a href="#" onClick={handleGoogleAuth} aria-label="Google">
                <i className="fab fa-google"></i>
              </a>
            </div>
            <span>or use your account</span>
            <input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              value={formData.email}
              onChange={handleInputChange}
              required 
            />
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleInputChange}
              required 
            />
            <a href="#" className="forgot-password">Forgot your password?</a>
            <button type="submit">Sign In</button>
            <div className="mobile-switch">
              <p>Don't have an account?</p>
              <button type="button" onClick={() => setIsSignUp(true)}>Sign Up</button>
            </div>
          </form>
        </div>

        {/* Sliding Panel */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            <div className="panel-content panel-content-left">
              <h1 style={{color: '#d1d5db'}}>Welcome Back!</h1>
              <p>Stay connected by logging in with your credentials and continue your CareConnect experience</p>
              <button className="transparent-btn" onClick={() => setIsSignUp(false)}>Sign In</button>
            </div>
            <div className="panel-content panel-content-right">
              <h1 style={{color: '#d1d5db'}}>Hey There!</h1>
              <p>Begin your amazing journey with CareConnect by creating an account with us today</p>
              <button className="transparent-btn" onClick={() => setIsSignUp(true)}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
        
        .logo {
          margin-bottom: 20px;
        }

        .logo h2 {
          color: #3b82f6;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin: 0;
          letter-spacing: 1px;
        }
        
        .auth-wrapper {
          background-color: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
          width: 850px;
          max-width: 100%;
          min-height: 550px;
        }

        .auth-form-box {
          position: absolute;
          top: 0;
          height: 100%;
          transition: all 0.6s ease-in-out;
        }

        .login-form-box {
          left: 0;
          width: 50%;
          z-index: 2;
        }

        .auth-wrapper.panel-active .login-form-box {
          transform: translateX(100%);
        }

        .register-form-box {
          left: 0;
          width: 50%;
          opacity: 0;
          z-index: 1;
        }

        .auth-wrapper.panel-active .register-form-box {
          transform: translateX(100%);
          opacity: 1;
          z-index: 5;
          animation: show 0.6s;
        }

        @keyframes show {
          0%, 49.99% {
            opacity: 0;
            z-index: 1;
          }
          50%, 100% {
            opacity: 1;
            z-index: 5;
          }
        }

        .slide-panel-wrapper {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 100%;
          overflow: hidden;
          transition: transform 0.6s ease-in-out;
          z-index: 100;
        }

        .auth-wrapper.panel-active .slide-panel-wrapper {
          transform: translateX(-100%);
        }

        .slide-panel {
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          background-size: cover;
          background-position: center;
          color: #FFFFFF;
          position: relative;
          left: -100%;
          height: 100%;
          width: 200%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
        }

        .auth-wrapper.panel-active .slide-panel {
          transform: translateX(50%);
        }

        .panel-content {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 50px;
          text-align: center;
          top: 0;
          height: 100%;
          width: 50%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .panel-content-left {
          transform: translateX(-20%);
        }

        .auth-wrapper.panel-active .panel-content-left {
          transform: translateX(0);
        }

        .panel-content-right {
          right: 0;
          transform: translateX(0);
        }

        .auth-wrapper.panel-active .panel-content-right {
          transform: translateX(20%);
        }

        form {
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 40px 50px;
          height: 100%;
          text-align: center;
          border-radius: 20px;
        }

        h1 {
          font-weight: 700;
          margin: 0 0 20px 0;
          font-size: 28px;
          color: #333;
        }

        input {
          background-color: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 14px 18px;
          margin: 8px 0;
          width: 100%;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        input:focus {
          outline: none;
          border-color: #3b82f6;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        button {
          border-radius: 25px;
          border: none;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          padding: 14px 50px;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
          margin: 10px 0;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
        }

        button.transparent-btn {
          background: transparent;
          border: 2px solid #FFFFFF;
          box-shadow: none;
        }

        button.transparent-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .social-links {
          margin: 25px 0;
        }

        .social-links a {
          border: 2px solid #e0e0e0;
          border-radius: 50%;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          margin: 0 8px;
          height: 45px;
          width: 45px;
          transition: all 0.3s ease;
          color: #3b82f6;
          text-decoration: none;
        }

        .social-links a:hover {
          border-color: #3b82f6;
          background: #3b82f6;
          color: #fff;
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4);
        }

        span {
          font-size: 13px;
          color: #666;
          margin: 15px 0;
          display: block;
        }

        a {
          color: #3b82f6;
          font-size: 14px;
          text-decoration: none;
          margin: 15px 0;
        }

        .forgot-password {
          display: block;
          text-align: center;
          margin: 10px 0 20px 0;
        }

        .mobile-switch {
          display: none;
          margin-top: 20px;
        }

        .mobile-switch p {
          color: #666;
          font-size: 14px;
          margin: 10px 0;
        }

        .mobile-switch button {
          background: transparent;
          color: #3b82f6;
          border: 2px solid #3b82f6;
          padding: 10px 30px;
          font-size: 12px;
          box-shadow: none;
        }

        .mobile-switch button:hover {
          background: #3b82f6;
          color: #fff;
        }

        @media (max-width: 768px) {
          .auth-wrapper {
            width: 100%;
            border-radius: 15px;
            background-color: rgba(255, 255, 255, 0.95);
          }

          .auth-form-box {
            position: static !important;
            width: 100% !important;
            transform: none !important;
            opacity: 1 !important;
          }

          .register-form-box {
            display: ${isSignUp ? 'block' : 'none'};
          }

          .login-form-box {
            display: ${isSignUp ? 'none' : 'block'};
          }

          .slide-panel-wrapper {
            display: none !important;
          }

          form {
            padding: 30px 25px;
            height: auto;
            background-color: rgba(255, 255, 255, 0.95);
          }

          .logo h2 {
            font-size: 20px;
          }

          .mobile-switch {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

export default Auth;