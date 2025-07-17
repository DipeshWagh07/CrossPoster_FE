import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LinkedInCallback from "./components/LinkedInCallback";
import InstagramCallback from "./components/InstagramCallback";
import FacebookCallback from "./components/FacebookCallback";
import YouTubeCallback from "./components/YoutubeCallback";
import TwitterCallback from "./components/TwitterXCallback";
import Dashboard from "./components/Dashboard";
import TikTokCallback from "./components/TikTokCallback";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Social Media Integration App</h1>
        </header>
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
            <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
            <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
            <Route path="/auth/youtube/callback" element={<YouTubeCallback />} />
            <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
            <Route path="/tiktok-callback" element={<TikTokCallback />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>Social Media Integration App © {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;