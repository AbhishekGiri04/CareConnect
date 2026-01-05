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
  const { login } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleGoogleAuth = () => {
    // Google OAuth integration
    console.log('Google auth clicked');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-5">
      <div className={`auth-wrapper ${isSignUp ? 'panel-active' : ''}`}>
        {/* Sign Up Form */}
        <div className="auth-form-box register-form-box">
          <form onSubmit={handleSubmit}>
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
            <a href="#">Forgot your password?</a>
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
              <h1>Welcome Back!</h1>
              <p>Stay connected by logging in with your credentials and continue your CareConnect experience</p>
              <button className="transparent-btn" onClick={() => setIsSignUp(false)}>Sign In</button>
            </div>
            <div className="panel-content panel-content-right">
              <h1>Hey There!</h1>
              <p>Begin your amazing journey with CareConnect by creating an account with us today</p>
              <button className="transparent-btn" onClick={() => setIsSignUp(true)}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
        
        .auth-wrapper {
          background-color: #fff;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          background-color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 50px;
          height: 100%;
          text-align: center;
        }

        h1 {
          font-weight: 700;
          margin: 0 0 20px 0;
          font-size: 28px;
          color: #333;
        }

        input {
          background-color: #f3f4f6;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 14px 18px;
          margin: 8px 0;
          width: 100%;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        input:focus {
          outline: none;
          border-color: #667eea;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        button {
          border-radius: 25px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          padding: 14px 50px;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          margin: 10px 0;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
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
          color: #667eea;
          text-decoration: none;
        }

        .social-links a:hover {
          border-color: #667eea;
          background: #667eea;
          color: #fff;
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        span {
          font-size: 13px;
          color: #666;
          margin: 10px 0;
        }

        a {
          color: #667eea;
          font-size: 14px;
          text-decoration: none;
          margin: 15px 0;
        }

        .mobile-switch {
          display: none;
          margin-top: 20px;
          color: #667eea;
          font-size: 14px;
        }

        .mobile-switch p {
          margin: 10px 0;
          font-size: 14px;
        }

        .mobile-switch button {
          background: transparent;
          color: #667eea;
          border: 2px solid #667eea;
          padding: 10px 30px;
          margin-top: 10px;
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .auth-wrapper {
            width: 100%;
            border-radius: 15px;
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