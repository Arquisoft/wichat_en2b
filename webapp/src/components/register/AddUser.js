// src/components/AddUser.js
import React, { useState } from 'react';
import axios from 'axios';
import { Container, Typography, TextField, Button, Snackbar } from '@mui/material';

const apiEndpoint = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:8000';

const AddUser = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState('USER');
  const [date, setDate] = useState(Date.now());
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const addUser = async () => {
    try {
      setDate(Date.now());
      await axios.post(`${apiEndpoint}/users`, { username:username, password:password, role:role, createdAt:date });
      setOpenSnackbar(true);
    } catch (error) {
      setError(error.response.data.error);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ marginTop: 4 }}>
      <Typography component="h1" variant="h5">
        Add User
      </Typography>
      <TextField
        name="username"
        fullWidth
        required
        id="standard-required"
        label="Username"
        variant="standard"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      if (password !== passwordConfirm) {
        <TextField
          name="password"
          fullWidth
          required
          id="password-input"
          label="Password"
          type="password"
          variant="standard"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      } else {
        <TextField
          name="password"
          fullWidth
          required
          id="password-input"
          label="Password"
          type="password"
          variant="filled"
          color="success"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      }
      if (password !== passwordConfirm) {
        <TextField
          name="passwordConfirm"
          error
          fullWidth
          required
          id="passwordConfirm-input"
          label="Confirm password"
          type="password"
          variant="standard"
          helperText="Passwords do not match"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
      } else {
        <TextField
          name="passwordConfirm"
          fullWidth
          required
          id="passwordConfirm-input"
          label="Confirm password"
          type="password"
          variant="filled"
          color="success"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
      }
             
      <Button variant="contained" color="primary" onClick={addUser}>
        Add User
      </Button>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar} message="User added successfully" />
      {error && (
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} message={`Error: ${error}`} />
      )}
    </Container>
  );
};

export default AddUser;
