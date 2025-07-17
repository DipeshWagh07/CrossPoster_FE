import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../styles.css";

const LinkedInCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Authenticating with LinkedIn...');
  const [error, setError] = useState('');
  const hasExchangedCode = useRef(false);
  
  useEffect(() => {
    const fetchAccessToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!code || !state) {
        setError('Missing code or state in callback URL.');
        return;
      }

      if (hasExchangedCode.current) return;
      hasExchangedCode.current = true;

      try {
        const response = await axios.post('http://localhost:8000/auth/linkedin/exchange', {
          code,
          redirectUri: 'http://localhost:3000/auth/linkedin/callback',
        });

        const { accessToken } = response.data;

        if (accessToken) {
          localStorage.setItem('linkedin_access_token', accessToken);
          setStatus('LinkedIn authentication successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          setError('No access token received.');
        }
      } catch (err) {
        console.error(err);
        setError(`Error fetching access token: ${err.response?.data?.error || err.message}`);
      }
    };

    fetchAccessToken();
  }, [navigate]);
  return (
    <div className="callback-container">
      {error ? (
        <div className="error-message">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="return-button">
            Return to Dashboard
          </button>
        </div>
      ) : (
        <div className="status-message">
          <div className="loader"></div>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
};

export default LinkedInCallback;