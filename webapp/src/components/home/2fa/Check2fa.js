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
  console.log(username);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      const response = await fetch(`${apiEndpoint}/verify2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: twoFactorCode,
          username: username
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      // On successful 2FA verification, update the token in the cookie
      document.cookie = `token=${data.token}; path=/; max-age=3600`;
      router.push("/"); // Redirect to home after 2FA success
    } catch (err) {
      setError(err.error || "Verification failed");
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
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
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
