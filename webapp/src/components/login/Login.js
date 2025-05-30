"use client";

import React, {useEffect, useRef, useState} from "react";
import { useRouter } from "next/navigation";
import "../../styles/login/Login.css";
import "../../styles/globals.css";
import Check2fa from "@/components/home/2fa/Check2fa";
import { loginUser } from "@/utils/LoginUtil";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [has2fa, setHas2fa] = useState(false);
  const router = useRouter();

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (usernameRef.current?.value && usernameRef.current.value !== username) {
      setUsername(usernameRef.current.value);
    }

    if (passwordRef.current?.value && passwordRef.current.value !== password) {
      setPassword(passwordRef.current.value);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Fetch token from cookies if it's available
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];


      const data = await loginUser(
        username,
        password,
        apiEndpoint,
        token
      );

      // Redirect to the home page after login
      if(data.has2fa){
        setHas2fa(true);
      }else{
        // On successful login, set the token in the cookie
        document.cookie = `token=${data.token}; path=/; max-age=3600`;
        const guestData = localStorage.getItem("guestGameData");
        if (guestData) {
          try {
            await fetch(`${apiEndpoint}/game`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
              },
              body: guestData,
            });
            localStorage.removeItem("guestGameData");
          } catch (err) {
            console.error("Failed to save guest data after login:", err);
          }
        }

        router.push("/");
      }
    } catch (err) {
      if (err.error === "You are already logged in") {
        // Redirect to home if already logged in
        router.push("/");
      } else if (err.field) {
        setErrors({ [err.field]: err.error });
      } else {
        setErrors({ general: err.error || "Login failed" });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <button onClick={() => window.location.href = '/'}></button>
        <h2>Welcome to WIChat</h2>
        <p>Login to start playing!</p>
        {errors.general && <p className="error-message">{errors.general}</p>}
        {has2fa ? (
          <Check2fa username={username}/>
        ) : (
          <form onSubmit={handleSubmit}>

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
            {errors.username && <p className="error-message" id='error-username'>{errors.username}</p>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              ref={passwordRef}
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
        )}
        <p className="register-link">
          Don’t have an account? <a href="/addUser">Register here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;