import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TwitterCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleTwitterCallback = async () => {
      try {
        console.log("Processing Twitter callback...");
        const params = new URLSearchParams(location.search);
        console.log("URL params:", Object.fromEntries(params));

        // Check if there's an error from the redirect
        const errorParam = params.get("error");
        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }

        // Check if we got success from backend
        const success = params.get("success");

        if (success === "true") {
          console.log("Twitter authentication successful");

          // Get tokens from URL params
          const accessToken = params.get("access_token");
          const accessSecret = params.get("access_secret");

          console.log("Tokens received:", {
            accessToken: accessToken ? "Present" : "Missing",
            accessSecret: accessSecret ? "Present" : "Missing",
          });

          if (accessToken && accessSecret) {
            localStorage.setItem(
              "twitterX_access_token",
              decodeURIComponent(accessToken)
            );
            localStorage.setItem(
              "twitterX_access_secret",
              decodeURIComponent(accessSecret)
            );
            console.log("Tokens stored in localStorage");
          }

          // Navigate to dashboard with success state
          console.log("Navigating to dashboard...");
          navigate("/dashboard", {
            replace: true,
            state: {
              twitterConnected: true,
              justConnected: true,
            },
          });
          return;
        }

        // If we're here, authentication likely failed
        throw new Error("Twitter authentication failed. Please try again.");
      } catch (err) {
        console.error("Twitter callback error:", err);
        localStorage.removeItem("twitterX_access_token");
        localStorage.removeItem("twitterX_access_secret");
        setError(err.message || "Twitter authentication failed");

        // Redirect to dashboard with error after 3 seconds
        setTimeout(() => {
          navigate("/dashboard", {
            replace: true,
            state: {
              twitterError: err.message || "Twitter authentication failed",
            },
          });
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleTwitterCallback();
  }, [location, navigate]);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}></div>
        <p style={styles.text}>Connecting your Twitter account...</p>
        <p style={styles.subText}>
          Please wait while we complete the authentication...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.alert}>
          <strong>Authentication Error:</strong> {error}
        </div>
        <p style={styles.text}>Redirecting you back to the dashboard...</p>
        <p style={styles.text}>
          <a href="/dashboard" style={styles.link}>
            Click here if not redirected automatically
          </a>
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.success}>
        <strong>Success!</strong> Twitter account connected successfully.
      </div>
      <p style={styles.text}>Redirecting to dashboard...</p>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  spinner: {
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #1da1f2",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  text: {
    fontSize: "18px",
    color: "#333",
    textAlign: "center",
    margin: "10px 0",
  },
  subText: {
    fontSize: "14px",
    color: "#666",
    textAlign: "center",
  },
  alert: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "15px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
  success: {
    backgroundColor: "#d1edff",
    color: "#0c5460",
    padding: "15px",
    borderRadius: "5px",
    marginBottom: "20px",
    textAlign: "center",
  },
  link: {
    color: "#1da1f2",
    textDecoration: "none",
  },
};

export default TwitterCallback;
