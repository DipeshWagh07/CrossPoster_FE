import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../styles.css";

const FacebookCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Authenticating with Facebook...');
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
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/auth/facebook/exchange`, {
            code,
          redirectUri: 'https://cross-poster-fe.vercel.app/auth/facebook/callback',
        });

        const { accessToken, pages } = response.data;

        if (accessToken) {
          localStorage.setItem('facebook_access_token', accessToken);
          if (pages) {
            localStorage.setItem('facebook_pages', JSON.stringify(pages));
          }
          setStatus('Facebook authentication successful! Redirecting...');
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
          <h2>Facebook Authentication Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="return-button">
            Return to Dashboard
          </button>
        </div> ) : (
        <div className="status-message">
          <div className="loader"></div>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
};
export default FacebookCallback;