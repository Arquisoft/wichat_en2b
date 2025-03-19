import React, { useState } from "react";
import PropTypes from "prop-types"; // Import PropTypes for validation
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Save, Edit } from "@mui/icons-material";

export default function ProfileForm({ onSave }) {
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "QuizMaster",
    email: "quizmaster@example.com",
    bio: "Quiz enthusiast and knowledge seeker",
    notifications: true,
    darkMode: false,
    soundEffects: true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name) => (e) => {
    setProfileData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  const handleSave = () => {
    setEditing(false);
    onSave(profileData);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ width: 64, height: 64, mr: 2 }}>
            {profileData.username.charAt(0)}
          </Avatar>
          <Typography variant="h6">{profileData.username}</Typography>
        </Box>

        <Box component="form" sx={{ "& .MuiTextField-root": { mb: 2 } }}>
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={profileData.username}
            onChange={handleChange}
            disabled={!editing}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={profileData.email}
            onChange={handleChange}
            disabled={!editing}
          />
          <TextField
            fullWidth
            label="Bio"
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={!editing}
          />
        </Box>

        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Preferences
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={profileData.notifications}
              onChange={handleToggle("notifications")}
              disabled={!editing}
            />
          }
          label="Notifications"
        />
        <FormControlLabel
          control={
            <Switch
              checked={profileData.darkMode}
              onChange={handleToggle("darkMode")}
              disabled={!editing}
            />
          }
          label="Dark Mode"
        />
        <FormControlLabel
          control={
            <Switch
              checked={profileData.soundEffects}
              onChange={handleToggle("soundEffects")}
              disabled={!editing}
            />
          }
          label="Sound Effects"
        />

        <Box sx={{ mt: 3 }}>
          {editing ? (
            <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
              Save Changes
            </Button>
          ) : (
            <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Add PropTypes validation
ProfileForm.propTypes = {
  onSave: PropTypes.func.isRequired, // Validate that onSave is a required function
};