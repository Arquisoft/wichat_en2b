"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import "../../styles/globals.css";
import "../../styles/register/Register.css";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

const AddUser = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const validateForm = () => {
    const newErrors = {};

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedUsername) {
      newErrors.username = "Username is required";
    } else if (trimmedUsername.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (trimmedUsername.includes(" ")) {
      newErrors.username = "Username cannot contain white spaces";
    }

    if (!trimmedPassword) {
      newErrors.password = "Password is required";
    } else if (trimmedPassword.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!trimmedConfirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (trimmedPassword !== trimmedConfirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const user = {
        username,
        password,
        role: "USER",
      };

      await axios.post(`${apiEndpoint}/adduser`, user);
      router.push("/login");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        if (error.response.data.error === "Username already exists") {
          setValidationErrors({ username: "Username already exists" });
        }
      } else {
        setError("An error has occurred. Please try again later.");
      }
      setIsSubmitting(false);
    }
  };

  return (
      <div className="register-container">
        <div className="register-card">
          <h2>Create an Account</h2>
          <p>Enter your username and password below to sign up!</p>

          {error && <p className="error-message">{error}</p>}

          <form onSubmit={addUser}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={isSubmitting}
              />
              {validationErrors.username && (
                  <p className="error-message">{validationErrors.username}</p>
              )}
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
                  disabled={isSubmitting}
              />
              {validationErrors.password && (
                  <p className="error-message">{validationErrors.password}</p>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={isSubmitting}
              />
              {validationErrors.confirmPassword && (
                  <p className="error-message">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button type="submit" className="register-button" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register"}
            </button>
          </form>

          <p className="register-link">
            Already have an account? <a href="/login">Login here</a>
          </p>
        </div>
      </div>
  );
};

export default AddUser;
