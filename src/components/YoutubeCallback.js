import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles.css";

const YouTubeCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Authenticating with YouTube...');
  const [error, setError] = useState('');
  
  useEffect(() => {
    const handleCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('accessToken');
      const refreshToken = urlParams.get('refreshToken');
      const channelId = urlParams.get('channelId');
      const channelName = urlParams.get('channelName');
      const errorParam = urlParams.get('error');

      if (errorParam) {
        setError(`YouTube authentication failed: ${decodeURIComponent(errorParam)}`);
        return;
      }

      if (accessToken) {
        // Store tokens in localStorage
        localStorage.setItem('youtube_access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('youtube_refresh_token', refreshToken);
        }
        if (channelId) {
          localStorage.setItem('youtube_channel_id', channelId);
        }
        if (channelName) {
          localStorage.setItem('youtube_channel_name', decodeURIComponent(channelName));
        }

        setStatus('YouTube authentication successful! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setError('No access token received from YouTube.');
      }
    };

    handleCallback();
  }, [navigate]);
  return (
    <div className="callback-container">
      {error ? (
        <div className="error-message">
          <h2>YouTube Authentication Error</h2>
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
export default YouTubeCallback ;