import React, { useState } from "react";
import PropTypes from "prop-types";
import { Save, Edit, Lock, Security, Person, VerifiedUser } from "@mui/icons-material";
import "../../../styles/home/ProfilePage.css"; 

import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Button,
    Avatar,
    Tabs,
    TextField,
    Tab,
    Snackbar,
} from "@mui/material";


/**
 * This component renders a form to edit the user profile.
 * 
 * @param {String} username 
 * @param {Function} onSave
 * 
 * @returns {JSX.Element} 
 */
export default function ProfileForm({ username, onSave }) {
    if (!username || typeof onSave !== "function") {
        throw new Error("Invalid props for ProfileForm component.");
    }

    const [editing, setEditing] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    /**
     * REMARK: To be decided how the password change is managed.
     */
    const [profileData, setProfileData] = useState({
      username: username,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    const handleChange = (e) => {
      const { name, value } = e.target;
      setProfileData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
      try {
          const token = localStorage.getItem("token");
          const payload = {};
  
          // Solo agregar campos si fueron modificados
          if (profileData.username !== currentUsername) {
              payload.username = profileData.username;
          }
  
          if (profileData.newPassword) {
              payload.password = profileData.newPassword;
          }
  
          if (Object.keys(payload).length === 0) {
              alert("No changes detected.");
              return;
          }
  
          const response = await fetch(`http://gatewayservice:8000/users/${currentUsername}`, {
              method: "PATCH",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
          });
  
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Error updating profile");
          }
  
          setEditing(false);
          setOpenSnackbar(true);
      } catch (error) {
          console.error("Failed to update profile:", error);
      }
    };  
  
    return (
      <Card className="profile-container">

        <CardContent>
          {/* Username */}
          <Box className="profile-header">
            <Avatar className="profile-avatar">
                {typeof username === "string" && username.length > 0 ? username.charAt(0) : "?"}
            </Avatar>
            <Typography variant="h6">
                {typeof username === "string" ? username : "Unknown User"}
            </Typography>
          </Box>

          {/* Tabs */}
          <div className="tabs-container">
            <Tabs 
              value={tabIndex} 
              onChange={(e, newValue) => setTabIndex(newValue)} 
              scrollButtons="auto"
              variant="scrollable"
            >
              <Tab label="Account" icon={<Person />} />
              <Tab label="Security" icon={<Lock />} />
              <Tab label="2FA" icon={<Security />} />
            </Tabs>
          </div>


          {/* Account tab */}
          {tabIndex === 0 && (
            <Box component="form" className="form-section">
              <TextField fullWidth label="Username" 
                  name="username" value={profileData.username} 
                  onChange={handleChange} disabled={!editing} />
              </Box>
          )}

          {/* Security tab */}
          {tabIndex === 1 && (
            <Box className="form-section">
              <TextField fullWidth label="Actual password" 
                    name="currentPassword" type="password" 
                    value={profileData.currentPassword} onChange={handleChange} disabled={!editing} />
              <TextField fullWidth label="New password" 
                    name="newPassword" type="password" value={profileData.newPassword} 
                    onChange={handleChange} disabled={!editing} />
              <TextField fullWidth label="Confirm new password" 
                    name="confirmPassword" type="password" value={profileData.confirmPassword} 
                    onChange={handleChange} disabled={!editing} />
            </Box>
          )}

          {/* Authentication tab */}
          {tabIndex === 2 && (
            <Card className="twofa-card">
              <CardHeader title="2-step authentication" />

              <CardContent>
                <Typography variant="body1">Add an extra layer of security.</Typography>

                {/* App authentication */}
                <Box className="twofa-option">
                  <VerifiedUser className="twofa-icon" />
                  <Typography variant="subtitle1" className="twofa-option-text">Application</Typography>              
                  <Button variant="contained" color="primary">Configure</Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Save/Edit button */}
          <Box className="save-button">
            {(tabIndex !== 2) && (
              <>
                {editing ? (
                  <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                    Save
                  </Button>
                ) : (
                  <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}
              </>
            )}
          </Box>


          {/* Confirmation snackbar */}
          <Snackbar open={openSnackbar} autoHideDuration={3000} 
              onClose={() => setOpenSnackbar(false)} message="Profile updated correctly." />
        </CardContent>
      </Card>
    );
}

// Prop types validation
ProfileForm.propTypes = {
  username: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};
