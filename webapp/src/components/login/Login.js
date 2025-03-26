"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/login/Login.css"
import "../../styles/globals.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({}); // Single object for all field errors
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: {
            username,
            password,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data; // Throw the error object from the backend
      }

      document.cookie = `token=${data.token}; path=/; max-age=3600`;
      router.push("/");
    } catch (err) {
      if (err.field) {
        setErrors({ [err.field]: err.error }); // Set error for specific field
      } else {
        setErrors({ general: err.error || "Login failed" }); // Fallback for generic errors
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to WIChat</h2>
        <p>Login to start playing!</p>
        {errors.general && <p className="error-message">{errors.general}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
            {errors.username && <p className="error-message">{errors.username}</p>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="register-link">
          Don’t have an account? <a href="/addUser">Register here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;