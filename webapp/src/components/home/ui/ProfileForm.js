import React, { useState } from "react";
import PropTypes from "prop-types";
import { Save, Edit, Lock, Security, Person, Smartphone, VerifiedUser } from "@mui/icons-material";
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

    const handleSave = () => {
      setEditing(false);
      setOpenSnackbar(true);
      onSave(profileData);
    };

    return (
      <Card className="profile-container">

        <CardContent>
          {/* Username */}
          <Box className="profile-header">
            <Avatar className="profile-avatar">{profileData.username.charAt(0)}</Avatar>
            <Typography variant="h6">{profileData.username}</Typography>
          </Box>

          {/* Tabs */}
          <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} centered>
            <Tab label="Cuenta" icon={<Person />} />
            <Tab label="Seguridad" icon={<Lock />} />
            <Tab label="2FA" icon={<Security />} />
          </Tabs>

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
              <TextField fullWidth label="Contraseña actual" 
                    name="currentPassword" type="password" 
                    value={profileData.currentPassword} onChange={handleChange} disabled={!editing} />
              <TextField fullWidth label="Nueva contraseña" 
                    name="newPassword" type="password" value={profileData.newPassword} 
                    onChange={handleChange} disabled={!editing} />
              <TextField fullWidth label="Confirmar nueva contraseña" 
                    name="confirmPassword" type="password" value={profileData.confirmPassword} 
                    onChange={handleChange} disabled={!editing} />
            </Box>
          )}

          {/* Authentication tab */}
          {tabIndex === 2 && (
            <Card className="twofa-card">
              <CardHeader title="Autenticación en dos pasos" />
              <CardContent>
                <Typography variant="body1">Agrega una capa extra de seguridad a tu cuenta.</Typography>

                {/* App authentication */}
                <Box className="twofa-option">
                  <VerifiedUser className="twofa-icon" />
                  <Box>
                    <Typography variant="subtitle1">Auth app</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Use Google Authenticator.
                    </Typography>
                  </Box>
                  <Button variant="contained" color="primary">Configure</Button>
                </Box>

                {/* SMS authentication */}
                <Box className="twofa-option">
                  <Smartphone className="twofa-icon" />
                  <Box>
                    <Typography variant="subtitle1">Text message</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Receive an SMS code in your phone.
                    </Typography>
                  </Box>
                  <Button variant="contained" color="primary">Configure</Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Save/Edit button */}
          <Box className="save-button">
            {editing ? (
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditing(true)}>
                Edit
              </Button>
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
