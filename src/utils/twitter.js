import axios from 'axios';

export const checkTwitterConnection = async () => {
  try {
    const response = await axios.get('/api/twitter/status', { withCredentials: true });
    return response.data.connected;
  } catch (error) {
    console.error('Error checking Twitter connection:', error);
    return false;
  }
};

export const getTwitterProfile = async () => {
  try {
    const response = await axios.get('/api/twitter/profile', { withCredentials: true });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching Twitter profile:', error);
    return null;
  }
};

export const postToTwitter = async (content, mediaUrl = null) => {
  try {
    const postData = { content };
    if (mediaUrl) {
      postData.mediaUrls = [mediaUrl];
    }

    const response = await axios.post('/api/twitter/post', postData, { withCredentials: true });
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to post to Twitter'
    };
  }
};

export const postThreadToTwitter = async (tweets) => {
  try {
    const response = await axios.post('/api/twitter/thread', { tweets }, { withCredentials: true });
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Error posting thread to Twitter:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to post thread to Twitter'
    };
  }
};

export const disconnectTwitter = async () => {
  try {
    await axios.delete('/api/twitter/disconnect', { withCredentials: true });
    localStorage.removeItem('twitterX_access_token');
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting Twitter:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to disconnect Twitter'
    };
  }
};