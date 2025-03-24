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
  Container,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import '../../styles/register/Register.css';

const apiEndpoint = process.env.GATEWAY_SERVICE_URL || 'http://localhost:8000';

const AddUser = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [date, setDate] = useState(Date.now());
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors = {}
  
    // Validate username
    if (!username) {
      newErrors.username = "Username is required"
    }
  
    // Validate password
    if (!password) {
      newErrors.password = "Password is required"
    }
  
    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
  
    setValidationErrors(newErrors)
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
      setDate(new Date().toLocaleDateString());
      setRole('USER');
      const User =
      {
        username:username,
        password:password,
        role:role,
        createdAt:date
      }

      await axios.post(`${apiEndpoint}/adduser`, User).then((response) => {
        console.log(response);
      });
      setOpenSnackbar(true);
    } catch (error) {    
      if (error.response && error.response.status === 400 && error.response.data.error === 'Username already exists') {
        const newErrors = { ...validationErrors };
        newErrors.username = 'Username already exists'; // Set the error message for the username field
        setValidationErrors(newErrors);
      } else if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error); // Use the error message from the server
      } else if (error.response && error.response.data) {
        setError(error.response.data); // Use the entire response data if no specific error field exists
      } else {
        setError('An unexpected error occurred'); // Fallback for network or other errors
      }
    } finally{
      setIsSubmitting(false)
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <div component="main" className='register-container'>
      <Card sx={{ width: "100%", boxShadow: 3 }} className='register-card'>
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
          <Box className="input-group" component="form" onSubmit={addUser} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              variant="standard"
              autoComplete="username"
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
              label="Password"
              type="password"
              id="password"
              variant="standard"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              variant="standard"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
            />

            <Button className='register-button' type="submit" fullWidth variant="contained" 
              sx={{ mt: 3, mb: 2, py: 1.5 }} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: "white" }} />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar} message="User added successfully" />
              {error && (
                <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} message={error} />
              )}
          </Box>
        </CardContent>
      </Card>

    </div>
  );
};

export default AddUser;
