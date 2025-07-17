import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getUserURN } from "../utils/linkedin";
import "../styles.css";

// Constants for platform configurations
const PLATFORM_CONFIG = {
  linkedin: {
    name: "LinkedIn",
    storageKey: "linkedin_access_token",
    color: "#2867B2"
  },
  instagram: {
    name: "Instagram",
    storageKey: "instagram_user_id",
    color: "#E1306C",
    requiresFacebook: true
  },
  facebook: {
    name: "Facebook",
    storageKey: "facebook_access_token",
    color: "#1877F2"
  },
  youtube: {
    name: "YouTube",
    storageKey: "youtube_access_token",
    color: "#FF0000"
  },
  twitterX: {
    name: "TwitterX",
    storageKey: "twitterX_access_token",
    color: "#000000"
  },
  whatsapp: {
    name: "WhatsApp",
    storageKey: "whatsapp_access_token",
    color: "#25D366"
  },
  tiktok: {
    name: "TikTok",
    storageKey: "tiktok_access_token",
    color: "#000000",
    secondaryKey: "tiktok_open_id"
  }
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const Dashboard = () => {
  // State initialization
  const [platformTokens, setPlatformTokens] = useState(() => {
    const initialState = {};
    Object.keys(PLATFORM_CONFIG).forEach(platform => {
      const config = PLATFORM_CONFIG[platform];
      initialState[platform] = localStorage.getItem(config.storageKey) || "";
      if (config.secondaryKey) {
        initialState[config.secondaryKey] = localStorage.getItem(config.secondaryKey) || "";
      }
    });
    return initialState;
  });

  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState("");
  const [postContent, setPostContent] = useState({
    text: "",
    file: null,
    previewImage: null
  });
  const [uiState, setUiState] = useState({
    isPosting: false,
    status: "",
    tiktokStatus: ""
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    Object.keys(PLATFORM_CONFIG).reduce((acc, platform) => {
      acc[platform] = Boolean(platformTokens[platform]);
      return acc;
    }, {})
  );

  // Helper functions
  const updatePlatformToken = useCallback((platform, token, secondaryToken = null) => {
    const config = PLATFORM_CONFIG[platform];
    localStorage.setItem(config.storageKey, token);
    if (config.secondaryKey && secondaryToken) {
      localStorage.setItem(config.secondaryKey, secondaryToken);
    }
    
    setPlatformTokens(prev => ({
      ...prev,
      [platform]: token,
      ...(config.secondaryKey && secondaryToken ? { [config.secondaryKey]: secondaryToken } : {})
    }));
  }, []);

  const clearPlatformToken = useCallback((platform) => {
    const config = PLATFORM_CONFIG[platform];
    localStorage.removeItem(config.storageKey);
    if (config.secondaryKey) {
      localStorage.removeItem(config.secondaryKey);
    }
    
    setPlatformTokens(prev => ({
      ...prev,
      [platform]: "",
      ...(config.secondaryKey ? { [config.secondaryKey]: "" } : {})
    }));
  }, []);

  // Initialize connections on component mount
  useEffect(() => {
    const initConnections = async () => {
      try {
        // Load Facebook pages if Facebook is connected
        if (platformTokens.facebook) {
          await loadFacebookPages(platformTokens.facebook);
        }

        // Check for TikTok callback
        const urlParams = new URLSearchParams(window.location.search);
        const tiktokCode = urlParams.get("code");
        const tiktokState = urlParams.get("state");

        if (tiktokCode && tiktokState) {
          const savedState = localStorage.getItem('tiktok_auth_state');
          if (tiktokState === savedState) {
            await handleTikTokAuth(tiktokCode);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check token expiry periodically
        const interval = setInterval(checkTokenExpiry, 86400000); // 24 hours
        return () => clearInterval(interval);
      } catch (error) {
        console.error("Initialization error:", error);
        setUiState(prev => ({ ...prev, status: `Initialization error: ${error.message}` }));
      }
    };

    initConnections();
  }, [platformTokens.facebook]);

  // Facebook functions
  const loadFacebookPages = async (userAccessToken) => {
    try {
      if (!userAccessToken) throw new Error("No Facebook access token available");

      let longLivedToken = localStorage.getItem("fb_long_lived_token");
      if (!longLivedToken) {
        longLivedToken = await exchangeForLongLivedToken(userAccessToken);
        localStorage.setItem("fb_long_lived_token", longLivedToken);
        updatePlatformToken("facebook", longLivedToken);
      }

      const pagesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts`,
        {
          params: {
            access_token: longLivedToken,
            fields: "id,name,access_token,instagram_business_account{id,username}",
          },
        }
      );

      const pages = await Promise.all(
        pagesResponse.data.data.map(async (page) => {
          try {
            const tokenInfo = await verifyFacebookToken(page.access_token);
            let instagramAccount = null;

            if (page.instagram_business_account?.id) {
              const instagramResponse = await axios.get(
                `https://graph.facebook.com/v18.0/${page.instagram_business_account.id}`,
                {
                  params: {
                    access_token: page.access_token,
                    fields: "id,username,profile_picture_url",
                  },
                }
              );
              instagramAccount = instagramResponse.data;
            }

            return {
              id: page.id,
              name: page.name,
              accessToken: page.access_token,
              instagramAccount,
              tokenExpiresAt: tokenInfo.expires_at,
            };
          } catch (error) {
            console.error(`Token verification failed for page ${page.id}:`, error);
            return null;
          }
        })
      );

      const validPages = pages.filter(page => page !== null);
      if (validPages.length === 0) throw new Error("No valid pages found");

      setFacebookPages(validPages);
      localStorage.setItem("facebook_pages", JSON.stringify(validPages));

      if (!selectedFacebookPageId || !validPages.some(p => p.id === selectedFacebookPageId)) {
        setSelectedFacebookPageId(validPages[0]?.id || "");
      }
    } catch (error) {
      console.error("Facebook page loading error:", error);
      setUiState(prev => ({ ...prev, status: `Facebook Error: ${error.message}` }));

      if (error.message.includes("invalid token") || error.message.includes("expired")) {
        clearPlatformToken("facebook");
        setFacebookPages([]);
        setSelectedFacebookPageId("");
      }
    }
  };

  const exchangeForLongLivedToken = async (shortLivedToken) => {
    if (!process.env.REACT_APP_FB_APP_ID || !process.env.REACT_APP_FB_APP_SECRET) {
      throw new Error("Missing Facebook app credentials in environment variables");
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.REACT_APP_FB_APP_ID,
          client_secret: process.env.REACT_APP_FB_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      }
    );

    if (!response.data.access_token) {
      throw new Error("No access token returned in response");
    }

    return response.data.access_token;
  };

  const verifyFacebookToken = async (token) => {
    const response = await axios.get(
      `https://graph.facebook.com/debug_token`,
      {
        params: {
          input_token: token,
          access_token: `${process.env.REACT_APP_FB_APP_ID}|${process.env.REACT_APP_FB_APP_SECRET}`,
        },
      }
    );
    return response.data.data;
  };

  const checkTokenExpiry = async () => {
    const longLivedToken = localStorage.getItem("fb_long_lived_token");
    if (!longLivedToken) return;

    try {
      const debug = await axios.get(`https://graph.facebook.com/debug_token`, {
        params: {
          input_token: longLivedToken,
          access_token: `${process.env.REACT_APP_FB_APP_ID}|${process.env.REACT_APP_FB_APP_SECRET}`,
        },
      });

      const expiresAt = debug.data.data.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const daysLeft = Math.floor((expiresAt - now) / 86400);

      if (daysLeft < 7) {
        const newToken = await exchangeForLongLivedToken(longLivedToken);
        localStorage.setItem("fb_long_lived_token", newToken);
        updatePlatformToken("facebook", newToken);
      }
    } catch (error) {
      console.error("Token check failed:", error);
    }
  };

  // Platform connection handlers
  const handlePlatformToggle = async (platform) => {
    if (selectedPlatforms[platform]) {
      handleDisconnect(platform);
    } else {
      try {
        setUiState(prev => ({ ...prev, status: `Connecting ${PLATFORM_CONFIG[platform].name}...` }));
        
        switch (platform) {
          case "linkedin":
            connectLinkedIn();
            break;
          case "instagram":
            await connectInstagram();
            break;
          case "facebook":
            connectFacebook();
            break;
          case "youtube":
            connectYouTube();
            break;
          case "twitterX":
            await connectTwitterX();
            break;
          case "whatsapp":
            connectWhatsApp();
            break;
          case "tiktok":
            await connectTikTok();
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Error connecting ${platform}:`, error);
        setUiState(prev => ({ ...prev, status: `Error connecting ${PLATFORM_CONFIG[platform].name}: ${error.message}` }));
      }
    }
  };

  const connectLinkedIn = () => {
    const CLIENT_ID = process.env.REACT_APP_LINKEDIN_CLIENT_ID || "77igg9177iv3cg";
    const REDIRECT_URI = encodeURIComponent(
      `${window.location.origin}/auth/linkedin/callback`
    );
    const scope = encodeURIComponent("openid profile email w_member_social");
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&state=${state}`;
  };

  const connectInstagram = async () => {
    if (platformTokens.instagram) {
      setUiState(prev => ({ ...prev, status: "Instagram is already connected" }));
      return;
    }

    if (platformTokens.facebook && selectedFacebookPageId) {
      const pageInfo = await axios.get(
        `https://graph.facebook.com/v18.0/${selectedFacebookPageId}`,
        {
          params: {
            fields: "instagram_business_account{id,username}",
            access_token: platformTokens.facebook,
          },
        }
      );

      if (pageInfo.data.instagram_business_account) {
        const instagramAccount = pageInfo.data.instagram_business_account;
        updatePlatformToken("instagram", instagramAccount.id);
        setSelectedPlatforms(prev => ({ ...prev, instagram: true }));
        setUiState(prev => ({ ...prev, status: `Connected to Instagram account @${instagramAccount.username}` }));
        return;
      }
    }

    const CLIENT_ID = process.env.REACT_APP_INSTAGRAM_CLIENT_ID || "1057966605784043";
    const REDIRECT_URI = encodeURIComponent(
      `${window.location.origin}/auth/instagram/callback`
    );
    const scope = encodeURIComponent("user_profile,user_media");
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=code&state=${state}`;
  };

  const connectFacebook = () => {
    const CLIENT_ID = process.env.REACT_APP_FACEBOOK_CLIENT_ID || "1057966605784043";
    const REDIRECT_URI = encodeURIComponent(
      `${window.location.origin}/auth/facebook/callback`
    );
    const scope = encodeURIComponent(
      "pages_manage_posts,pages_read_engagement,pages_show_list"
    );
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=code&state=${state}`;
  };

  const connectYouTube = () => {
    window.location.href = `${API_BASE_URL}/auth/youtube`;
  };

  const connectTwitterX = async () => {
    try {
      clearPlatformToken("twitterX");
      const response = await axios.get(`${API_BASE_URL}/auth/twitter`);
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        throw new Error("Failed to get Twitter auth URL");
      }
    } catch (error) {
      console.error("Twitter connection error:", error);
      setUiState(prev => ({ ...prev, status: "Error: Failed to connect to Twitter" }));
    }
  };

  const connectWhatsApp = () => {
    const CLIENT_ID = process.env.REACT_APP_WHATSAPP_CLIENT_ID || "1057966605784043";
    const REDIRECT_URI = encodeURIComponent(
      `${window.location.origin}/auth/whatsapp/callback`
    );
    const scope = encodeURIComponent("whatsapp_business_messaging");
    const state = Math.random().toString(36).substring(2, 15);

    window.location.href = `https://www.whatsapp.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&state=${state}`;
  };

  const connectTikTok = async () => {
    try {
      setUiState(prev => ({ ...prev, tiktokStatus: "Connecting to TikTok..." }));
      clearPlatformToken("tiktok");
      
      const response = await axios.get(`${API_BASE_URL}/auth/tiktok`);
      const { authUrl, state } = response.data;
      
      localStorage.setItem('tiktok_auth_state', state);
      window.location.href = authUrl;
    } catch (error) {
      setUiState(prev => ({ 
        ...prev, 
        tiktokStatus: `TikTok connection failed: ${error.message}` 
      }));
      console.error('TikTok connection error:', error);
    }
  };

  const handleTikTokAuth = async (code) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/tiktok/exchange`, { code });
      const { access_token, open_id } = response.data;
      
      updatePlatformToken("tiktok", access_token, open_id);
      setSelectedPlatforms(prev => ({ ...prev, tiktok: true }));
      setUiState(prev => ({ 
        ...prev, 
        status: 'TikTok connected successfully!',
        tiktokStatus: ''
      }));
    } catch (error) {
      console.error('TikTok authentication error:', error);
      setUiState(prev => ({ 
        ...prev, 
        status: `TikTok connection failed: ${error.message}` 
      }));
    }
  };

  // Posting functions
  const postToTikTok = async (caption, file) => {
    if (!platformTokens.tiktok || !platformTokens.tiktokOpenId) {
      throw new Error('Please connect to TikTok first');
    }

    if (!file || !file.type.startsWith('video/')) {
      throw new Error('Please select a video file for TikTok');
    }

    setUiState(prev => ({ ...prev, status: 'Uploading video to TikTok...' }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accessToken', platformTokens.tiktok);
    formData.append('openId', platformTokens.tiktokOpenId);
    
    const uploadResponse = await axios.post(
      `${API_BASE_URL}/api/tiktok/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    const postResponse = await axios.post(
      `${API_BASE_URL}/api/tiktok/post`,
      {
        accessToken: platformTokens.tiktok,
        openId: platformTokens.tiktokOpenId,
        caption,
        videoId: uploadResponse.data.videoId
      }
    );

    return postResponse.data;
  };

  const postToInstagram = async (pageAccessToken, instagramUserId, caption, file) => {
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/api/instagram/upload`,
      uploadForm,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    if (!uploadResponse.data.url) {
      throw new Error("Failed to upload image to Cloudinary");
    }

    const postResponse = await axios.post(
      `${API_BASE_URL}/api/instagram/post`,
      {
        pageAccessToken,
        instagramUserId,
        caption,
        imageUrl: uploadResponse.data.url,
      }
    );

    return postResponse.data;
  };

  const handleDisconnect = (platform) => {
    clearPlatformToken(platform);
    
    if (platform === "facebook") {
      localStorage.removeItem("facebook_pages");
      setFacebookPages([]);
      setSelectedFacebookPageId("");
    }

    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: false,
    }));
  };

  const handleLogout = () => {
    Object.keys(PLATFORM_CONFIG).forEach(platform => {
      clearPlatformToken(platform);
    });
    
    localStorage.removeItem("facebook_pages");
    localStorage.removeItem("fb_long_lived_token");
    
    setFacebookPages([]);
    setSelectedPlatforms(
      Object.keys(PLATFORM_CONFIG).reduce((acc, platform) => {
        acc[platform] = false;
        return acc;
      }, {})
    );
  };

  // File handling
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPostContent(prev => ({
        ...prev,
        file,
        previewImage: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
      }));
    }
  };

  const handleRemoveImage = () => {
    setPostContent(prev => ({
      ...prev,
      file: null,
      previewImage: null
    }));
  };

  // Main post handler
  const handlePost = async () => {
    // Validation
    if (!postContent.text.trim() && !postContent.file) {
      setUiState(prev => ({ ...prev, status: "Please enter text or select an image to post" }));
      return;
    }

    if (!Object.values(selectedPlatforms).some(v => v)) {
      setUiState(prev => ({ ...prev, status: "Please select at least one platform to post to" }));
      return;
    }

    if (selectedPlatforms.youtube && (!postContent.file || !postContent.file.type.startsWith("video/"))) {
      setUiState(prev => ({ ...prev, status: "A video file is required for YouTube posts" }));
      return;
    }

    if (selectedPlatforms.tiktok && (!postContent.file || !postContent.file.type.startsWith("video/"))) {
      setUiState(prev => ({ ...prev, status: "A video file is required for TikTok posts" }));
      return;
    }

    setUiState(prev => ({ ...prev, isPosting: true, status: "Posting to selected platforms..." }));

    try {
      // Facebook/Instagram posting
      if (selectedPlatforms.facebook || selectedPlatforms.instagram) {
        const selectedPage = facebookPages.find(page => page.id === selectedFacebookPageId);
        if (!selectedPage) throw new Error("Selected Facebook page not found");

        await verifyFacebookToken(selectedPage.accessToken);

        if (selectedPlatforms.facebook) {
          const formData = new FormData();
          formData.append("message", postContent.text);
          if (postContent.file) formData.append("source", postContent.file);

          await axios.post(
            `https://graph.facebook.com/v18.0/${selectedPage.id}/photos`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${selectedPage.accessToken}`,
              },
            }
          );
        }

        if (selectedPlatforms.instagram && selectedPage.instagramAccount) {
          await postToInstagram(
            selectedPage.accessToken,
            selectedPage.instagramAccount.id,
            postContent.text,
            postContent.file
          );
        }
      }

      // LinkedIn posting
      if (selectedPlatforms.linkedin && platformTokens.linkedin) {
        const userUrn = await getUserURN(platformTokens.linkedin);
        await axios.post(`${API_BASE_URL}/api/post-to-linkedin`, {
          accessToken: platformTokens.linkedin,
          text: postContent.text,
          userUrn,
        });
      }

      // YouTube posting
      if (selectedPlatforms.youtube && platformTokens.youtube && postContent.file?.type.startsWith("video/")) {
        const formData = new FormData();
        formData.append("video", postContent.file);
        formData.append("title", postContent.text);

        await axios.post(
          `${API_BASE_URL}/api/upload-youtube-video`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      // TikTok posting
      if (selectedPlatforms.tiktok && platformTokens.tiktok) {
        await postToTikTok(postContent.text, postContent.file);
      }

      // Twitter posting
      if (selectedPlatforms.twitterX && platformTokens.twitterX) {
        await axios.post(
          `${API_BASE_URL}/api/twitter/post`,
          { content: postContent.text },
          { withCredentials: true }
        );
      }

      // WhatsApp posting
      if (selectedPlatforms.whatsapp && platformTokens.whatsapp) {
        await axios.post(
          `${API_BASE_URL}/api/whatsapp/post`,
          { message: postContent.text },
          { headers: { Authorization: `Bearer ${platformTokens.whatsapp}` } }
        );
      }

      setUiState(prev => ({ 
        ...prev, 
        status: "Successfully posted to selected platforms!" 
      }));
      setPostContent({ text: "", file: null, previewImage: null });
    } catch (error) {
      console.error("Posting error:", error);
      setUiState(prev => ({ 
        ...prev, 
        status: `Error: ${error.response?.data?.error?.message || error.message || "Failed to post"}` 
      }));
    } finally {
      setUiState(prev => ({ ...prev, isPosting: false }));
    }
  };

 const renderPlatformConnection = (platform) => {
  const config = PLATFORM_CONFIG[platform];
  const isConnected = Boolean(platformTokens[platform]);
  
  // Get platform-specific button class based on platform name
  const buttonClass = `${platform}-button`;
  
  return (
    <div className="platform-item" key={platform}>
      <div className="platform-status">
        <label>
          <input
            type="checkbox"
            checked={selectedPlatforms[platform]}
            onChange={() => handlePlatformToggle(platform)}
            disabled={!isConnected && selectedPlatforms[platform]}
          />
          {config.name} {isConnected ? "(Connected)" : "(Not Connected)"}
        </label>
        {platform === "tiktok" && uiState.tiktokStatus && (
          <div className={`status-message ${
            uiState.tiktokStatus.includes("Error") ? "error" : "success"
          }`}>
            {uiState.tiktokStatus}
          </div>
        )}
      </div>
      <button
        className={`connect-button ${buttonClass} ${isConnected ? "connected" : ""}`}
        onClick={isConnected ? () => handleDisconnect(platform) : () => handlePlatformToggle(platform)}
        disabled={platform === "tiktok" && uiState.tiktokStatus.includes('Connecting')}
      >
        {isConnected ? "Disconnect" : 
         platform === "tiktok" && uiState.tiktokStatus.includes('Connecting') ? 
         "Connecting..." : `Connect ${config.name}`}
      </button>
    </div>
  );
};

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Social Media Dashboard</h2>
        {Object.values(platformTokens).some(token => token) && (
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      <div className="platform-connections">
        <h3>Social Media Platforms</h3>
        <div className="platform-list">
          {Object.keys(PLATFORM_CONFIG).map(platform => renderPlatformConnection(platform))}
        </div>

        {platformTokens.facebook && facebookPages.length > 0 && (
          <div className="facebook-page-selection">
            <h4>Select Facebook Page</h4>
            <select
              value={selectedFacebookPageId}
              onChange={(e) => setSelectedFacebookPageId(e.target.value)}
              className="page-select"
            >
              {facebookPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="post-form">
        <h3>Create a Social Media Post</h3>
        <textarea
          className="post-textarea"
          value={postContent.text}
          onChange={(e) => setPostContent(prev => ({ ...prev, text: e.target.value }))}
          placeholder="What would you like to share?"
          rows={5}
          disabled={uiState.isPosting}
        />

        <div className="file-upload-container">
          <input
            type="file"
            id="file-upload"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={uiState.isPosting}
            className="file-input"
            style={{ display: "none" }}
          />
          <label htmlFor="file-upload" className="file-upload-label">
            {postContent.file ? postContent.file.name : "Choose an image/video"}
          </label>

          {postContent.previewImage && (
            <div className="image-preview-container">
              <img src={postContent.previewImage} alt="Preview" className="image-preview" />
              <button
                onClick={handleRemoveImage}
                className="remove-image-btn"
                disabled={uiState.isPosting}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <button
          className="post-button"
          onClick={handlePost}
          disabled={
            uiState.isPosting ||
            (!postContent.text.trim() && !postContent.file) ||
            !Object.values(selectedPlatforms).some(v => v) ||
            (selectedPlatforms.facebook && !selectedFacebookPageId) ||
            (selectedPlatforms.youtube && (!postContent.file || !postContent.file.type.startsWith("video/"))) ||
            (selectedPlatforms.tiktok && (!postContent.file || !postContent.file.type.startsWith("video/")))
          }
        >
          {uiState.isPosting ? "Posting..." : "Post to Selected Platforms"}
        </button>

        {uiState.status && (
          <div className={`status-message ${
            uiState.status.includes("Error") ? "error" : "success"
          }`}>
            {uiState.status}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;