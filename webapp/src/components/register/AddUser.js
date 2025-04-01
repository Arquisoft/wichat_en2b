// src/components/AddUser.js
import React, { useState } from 'react';
import axios from 'axios';
import {
  Button,
  TextField,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import '../../styles/register/Register.css';
import '../../styles/globals.css';
import { useRouter } from "next/navigation";

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

      // Fetch token from cookies if it's available
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];
  
      const response = await fetch(`${apiEndpoint}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Don't send token in Authorization header during login
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user: { username, password },
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw data;
      }
  
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
    <div component="main" className='register-container'>
      <Card className='register-card'>
        <CardHeader
          title={
            <Typography variant="h5" align="center" fontWeight="bold">
              Create an account
            </Typography>
          }
          subheader={
            <Typography variant="body2" align="center" color="textSecondary">
              Enter your details below to create your account
            </Typography>
          }
        />
        <CardContent>
          <Box className="input-group" component="form" onSubmit={addUser}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              name="username"
              variant="standard"
              autoComplete="username"
              placeholder='Username *'
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={!!validationErrors.username}
              helperText={validationErrors.username}
            />
            

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              type="password"
              id="password"
              variant="standard"
              placeholder='Password *'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!validationErrors.passwordErrors}
              helperText={validationErrors.passwordErrors}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              type="password"
              id="confirmPassword"
              variant="standard"
              placeholder='Confirm Password *'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!validationErrors.confirmPasswordErrors}
              helperText={validationErrors.confirmPasswordErrors}
            />

            <div className='register-link'>
              <a href="/login">Already have an account? Login here</a>
            </div>
                        
            <Button className='register-button' type="submit" fullWidth variant="contained" 
              disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: "white" }} />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
              
            {error && <p className="error-message">{error}</p>}

          </Box>
        </CardContent>
      </Card>

    </div>
  );
};

export default AddUser;
