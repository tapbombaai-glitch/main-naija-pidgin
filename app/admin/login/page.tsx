"use client";
import { useState } from "react";
import Link from "next/link";
import "./login.css";

export default function ChairmanLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, simple check - you fit connect to your backend later
    if (email && password) {
      window.location.href = "/admin/dashboard";
    } else {
      alert("Chairman, abeg fill email and password");
    }
  };

  return (
    <main className="loginPage">
      <div className="loginContent">
        <Link href="/" className="backLink">← Back to Home</Link>
        
        <div className="loginCard">
          <div className="loginHeader">
            <div className="crownIcon">👑</div>
            <div className="adminLabel">ADMINISTRATION</div>
            <h1>Chairman Panel</h1>
            <p>Login to review recordings and manage platform</p>
          </div>

          <form onSubmit={handleLogin} className="loginForm">
            <div className="inputGroup">
              <label>Chairman Email</label>
              <input 
                type="email" 
                placeholder="chairman@mainnaijapidgin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="inputGroup">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="loginBtn">
              Chairman Login →
            </button>
          </form>

          <div className="loginFooter">
            <span>MAIN NAIJA PIDGIN © 2026</span>
          </div>
        </div>
      </div>
    </main>
  );
}