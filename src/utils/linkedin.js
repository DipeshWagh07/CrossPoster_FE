import axios from 'axios';


export const getUserURN = async (accessToken) => {
  try {
    if (!accessToken) {
      console.error("Access token is missing.");
      return null;
    }

    const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/linkedin/userinfo`, {
      accessToken,
    });

    const { sub } = res.data;
    if (!sub) {
      console.error('No "sub" returned from LinkedIn response:', res.data);
      return null;
    }

    return `urn:li:person:${sub}`;
  } catch (err) {
    console.error("Error fetching user URN:", err.response?.data || err.message);
    return null;
  }
};