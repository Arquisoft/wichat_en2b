"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "../../../styles/login/Login.css";
import "../../../styles/globals.css";
const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

const Check2fa = ( username ) => {
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setLoading(true);
  
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];
  
      if (token) {
        router.push("/");
        return;
      }
  
      const response = await fetch(`${apiEndpoint}/verify2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: twoFactorCode,
          user: username,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "An error occurred");
      }
  
      document.cookie = `token=${data.token}; path=/; max-age=3600`;
      router.push("/"); 
    } catch (err) {
      setError(err.message); // Update state to show error on UI
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="two-factor-container">
      <h2>Two Factor Authentication</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="2faCode">Enter 2FA Code</label>
          <input
            type="text"
            id="2faCode"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder="Enter the 2FA code"
            required
          />
        </div>
        {error && <p id="error" className="error-message">{error}</p>}
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify Code"}
        </button>
      </form>
      <p className="cancel-link">
        <a href="/login">Cancel</a>
      </p>
    </div>
  );
};

export default Check2fa;
