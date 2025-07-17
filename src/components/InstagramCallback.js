import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles.css";

const InstagramCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Authenticating with Instagram...");
  const [error, setError] = useState("");
  const hasExchangedCode = useRef(false);

  useEffect(() => {
    const exchangeToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      if (error) {
        setError(`Instagram authentication failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setError("Missing authorization code or state parameter");
        return;
      }

      if (hasExchangedCode.current) return;
      hasExchangedCode.current = true;

      try {
        setStatus("Exchanging authorization code for access token...");

        const response = await axios.post(
          "http://localhost:8000/auth/instagram/token",
          {
            code,
            redirectUri: "http://localhost:3000/auth/instagram/callback",
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.data.success) {
          throw new Error(
            response.data.error || "Invalid response from server"
          );
        }

        const { userId, expiresIn } = response.data;

        localStorage.setItem("instagram_user_id", userId);
        localStorage.setItem(
          "instagram_token_expires",
          Date.now() + expiresIn * 1000
        );

        setStatus("Success! Redirecting to dashboard...");
        setTimeout(() => navigate("/dashboard"), 1500);
      } catch (err) {
        console.error("Token exchange error:", err.response?.data || err);

        const errMsg =
          typeof err?.response?.data?.details === "string"
            ? err.response.data.details
            : typeof err?.response?.data?.error === "string"
            ? err.response.data.error
            : err.message || "Authentication failed";

        setError(errMsg);
      }
    };

    exchangeToken();
  }, [navigate]);

  return (
    <div className="callback-container">
      {error ? (
        <div className="error-message">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="return-button"
          >
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

export default InstagramCallback;
