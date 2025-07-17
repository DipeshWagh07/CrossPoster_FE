import axios from "axios";

export const getFacebookPages = async (accessToken) => {
  try {
    if (!accessToken) {
      console.error("Facebook access token is missing.");
      return [];
    }

    const response = await axios.get(
      "http://localhost:8000/api/facebook/pages",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.pages || [];
  } catch (err) {
    console.error(
      "Error fetching Facebook pages:",
      err.response?.data || err.message
    );
    return [];
  }
};

export const postToFacebookPage = async (
  accessToken,
  pageId,
  message,
  imageUrl,
  link = null,
  picture = null
) => {
  try {
    if (!accessToken || !pageId) {
      throw new Error("Facebook access token or page ID is missing.");
    }

    const response = await axios.post(
      "http://localhost:8000/api/facebook/post",
      {
        userAccessToken: accessToken,
        pageId,
        message,
        imageUrl,
        link,
        picture,
      }
    );

    return response.data;
  } catch (err) {
    console.error(
      "Error posting to Facebook:",
      err.response?.data || err.message
    );
    throw err;
  }
};

export const checkFacebookAuthStatus = async (accessToken) => {
  try {
    if (!accessToken) return false;

    const response = await axios.get(
      "http://localhost:8000/api/facebook/status",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.authenticated || false;
  } catch (err) {
    console.error(
      "Error checking Facebook auth status:",
      err.response?.data || err.message
    );
    return false;
  }
};
