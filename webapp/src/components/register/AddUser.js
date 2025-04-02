"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import "../../styles/globals.css";
import "../../styles/register/Register.css";
import { loginUser } from '@/utils/LoginUtil';

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

const AddUser = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter();

  const validateForm = () => {
    const newErrors = {}
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedUsername) {
        newErrors.username = "Username is required";
    } else if (trimmedUsername.length < 3) {
        newErrors.username = "Username must be at least 3 characters";
    } else if (trimmedUsername.includes(" ")){
        newErrors.username = "Username cannot contain white spaces";
    }

    if (!trimmedPassword) {
        newErrors.passwordErrors = "The password is required"; // NOSONAR
    } else if (trimmedPassword.length < 6) {
        newErrors.passwordErrors = "The password must be at least 6 characters"; // NOSONAR
    }

    if (!trimmedConfirmPassword) {
        newErrors.confirmPasswordErrors = "Please confirm your password";
    } else if (trimmedPassword !== trimmedConfirmPassword) {
        newErrors.confirmPasswordErrors = "Passwords do not match";
    }
  
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0
  }

  const addUser = async (e) => {
    // For anyone reading, the default behavior of a form submit is to reload the page  
    e.preventDefault(); // Prevent the default form submit so that errors can be shown (if any)

    if (!validateForm()) { // If there are errors, do not submit the form
      return
    }

    setIsSubmitting(true)

    try {
      setRole('USER');
      const User =
      {
        username:username,
        password:password,
        role:role,
      }

      await axios.post(`${apiEndpoint}/adduser`, User);

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
      // On successful login, set the token in the cookie
      document.cookie = `token=${data.token}; path=/; max-age=3600`;
      router.push("/");

    } catch (error) {    
      if (error.response && error.response.status === 400) {
        if (error.response.data.error === 'Username already exists') {
          const newErrors = { ...validationErrors };
          newErrors.username = 'Username already exists'; // Set the error message for the username field
          setValidationErrors(newErrors);
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
