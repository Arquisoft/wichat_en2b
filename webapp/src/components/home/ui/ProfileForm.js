import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Save, Edit, Lock, Security, Person, VerifiedUser } from "@mui/icons-material";
import "../../../styles/home/ProfilePage.css"; 
import QrCode from "@/components/home/2fa/qrCode";

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

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';
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
    const [already2fa, setAlready2fa] = useState(false);
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

    const handleSave = () => {
      setEditing(false);
      setOpenSnackbar(true);
      onSave(profileData);
    };

    const [qrCodeUrl, setQrCodeUrl] = useState(null);

const setup2FA = async () => {
  try {
    const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];
    const response = await fetch(`${apiEndpoint}/setup2fa`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    setQrCodeUrl(data.imageUrl);
  } catch (error) {
    console.error(error);
  }
};

const check2FAStatus = async () => {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    console.log(token);
    const response = await fetch(`${apiEndpoint}/check2fa`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Check if the response is okay (status 200)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Read the response text first, and then try parsing JSON
    const responseText = await response.text();

    // Check if the response body is empty
    if (!responseText) {
      throw new Error("Empty response body received.");
    }

    // Parse the response text into JSON
    const data = JSON.parse(responseText);

    // Check if the secret exists (indicating 2FA is enabled)
    setAlready2fa(!!data.twoFactorEnabled);

  } catch (error) {
    console.error("Error checking 2FA status:", error);
  }
};


// Call check2FAStatus when component mounts
useEffect(() => {
  check2FAStatus();
}, [username]);

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
        <Typography variant="subtitle1" className="twofa-option-text">
          Application
        </Typography>

        {qrCodeUrl ? (
          <QrCode imgUrl={qrCodeUrl} />
        ) : (
          <Button variant="contained" color="primary" onClick={setup2FA}>
            {already2fa ? "Reset 2FA" : "Configure 2FA"}
          </Button>
        )}
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
