import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Save, Edit, Lock, Security, Person, VerifiedUser, CloudUpload } from "@mui/icons-material";
import "../../../styles/home/ProfilePage.css"; 
import "../../../styles/globals.css";
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
const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

/**
 * This component renders a form to edit the user profile.
 * 
 * @param {String} username 
 * @param {Function} onSave
 * 
 * @returns {JSX.Element} 
 */
export default function ProfileForm({ username, profilePicture, onSave }) {
    if (!username || typeof onSave !== "function") {
        throw new Error("Invalid props for ProfileForm component.");
    }

    const [editingAccount, setEditingAccount] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [profilePictureError, setProfilePictureError] = useState(null);

    // 2FA
    const [already2fa, setAlready2fa] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);

    const [profileData, setProfileData] = useState({
        username: username,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profilePicture: profilePicture,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData((prev) => ({ ...prev, [name]: value }));
    };

    const getToken = () => {
        const cookieToken = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];
        return cookieToken || localStorage.getItem("token");
    };

    const handleSaveUsername = async () => {
        if (profileData.username === username) {
            setSnackbarMessage("No changes on username detected.");
            setOpenSnackbar(true);
            return;
        }

        try {
            const token = getToken();
            const payload = { newUsername: profileData.username };

            const response = await fetch(`${apiEndpoint}/users`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();
            if (responseData) {

                // Update the cookie with the new token
                setProfileData((prev) => ({ ...prev, username: profileData.username }));

                setSnackbarMessage("Username updated successfully.");
                setOpenSnackbar(true);
                setEditingAccount(false);

                onSave({ ...profileData, username: profileData.username });

                // Reload the page to reflect the new username
                window.location.reload();
            } else {
                setSnackbarMessage(responseData.error || "Error updating username");
                setOpenSnackbar(true);
            }
        } catch (error) {
            console.error("Error updating username:", error);
            setSnackbarMessage(`Error: ${error.message}`);
            setOpenSnackbar(true);
        }
    };

    const handleSavePassword = async () => {
        if (!profileData.newPassword) {
            setSnackbarMessage("Please enter a new password.");
            setOpenSnackbar(true);
            setProfileData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
            return;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
            setSnackbarMessage("The new password and its confirmation do not match.");
            setOpenSnackbar(true);
            setProfileData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
            return;
        }
        if (!profileData.currentPassword) {
            setSnackbarMessage("Please enter your current password.");
            setOpenSnackbar(true);
            setProfileData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
            return;
        }

        try {
            const token = getToken();

            const payload = {
                oldPassword: profileData.currentPassword,
                newPassword: profileData.newPassword,
            };

            const response = await fetch(`${apiEndpoint}/users`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error updating password");
            }

            setSnackbarMessage("Password updated successfully.");
            setOpenSnackbar(true);
            setEditingPassword(false);

            setProfileData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
                profilePicture: prev.profilePicture,
            }));

            onSave({ ...profileData });
        } catch (error) {
            setSnackbarMessage(`${error.message}`);
            setOpenSnackbar(true);
            setProfileData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
        }
    };

    const setup2FA = async () => {
        try {
            const token = getToken();
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
            console.error("Error configuring 2FA:", error);
            setSnackbarMessage(`Error configuring 2FA: ${error.message}`);
            setOpenSnackbar(true);
        }
    };

    const check2FAStatus = async () => {
        try {
            const token = getToken();
            const response = await fetch(`${apiEndpoint}/check2fa`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Error HTTP! Estado: ${response.status}`);
            }

            const responseText = await response.text();
            if (!responseText) {
                throw new Error("Received an empty response.");
            }

            const data = JSON.parse(responseText);
            setAlready2fa(!!data.twoFactorEnabled);
        } catch (error) {
            console.error("Error checking 2FA status:", error);
            setSnackbarMessage(`Error checking 2FA: ${error.message}`);
            setOpenSnackbar(true);
        }
    };

    useEffect(() => {
        check2FAStatus();
    }, [username]);

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            setProfilePictureError("No file selected.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            setProfilePictureError("Invalid file type. Please select an image.");
            return;
        }
        if (file && file.size > FILE_SIZE_LIMIT) {
            setProfilePictureError("This file is too large. Maximum size is 2MB.");
            return;
        }

        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64Image = reader.result.split(',')[1];

            try {
                const token = getToken();
                setProfilePictureError(null);

                const response = await fetch(`${apiEndpoint}/user/profile/picture`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ image: base64Image, username: username }),
                });

                if (!response.ok) {
                    throw new Error(`Error HTTP! Estado: ${response.status}`);
                }

                const data = await response.json();
                setSnackbarMessage("Profile picture uploaded successfully.");
                setOpenSnackbar(true);

                setProfileData((prev) => ({
                    ...prev,
                    profilePicture: data.profilePicture,
                }));

            } catch (error) {
                console.error("Error uploading profile picture:", error);
                setSnackbarMessage(`Error: ${error.message}`);
                setOpenSnackbar(true);
            }
        };

        reader.readAsDataURL(file);
        window.location.reload();
    };

    return (
        <Card className="profile-container">
            <CardContent>
                {/* Header with Avatar and Name */}
                <Box className="profile-header">
                    <Avatar
                        className="profile-avatar"
                        src={profileData.profilePicture || ""}
                    >
                        {(!profileData.profilePicture) && (typeof username === "string" && username.length > 0 ? username.charAt(0) : "?")}
                    </Avatar>
                    <Typography variant="h6" className="profile-username" id='profile-username'>
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
                        className={"tabs-header"}
                    >
                        <Tab label="Account" icon={<Person />} />
                        <Tab label="Security" icon={<Lock />} />
                        <Tab label="2FA" icon={<Security />} />
                    </Tabs>
                </div>

                {/* Account */}
                {tabIndex === 0 && (
                    <Box component="form" className="form-section">
                        {/* Sección de foto de perfil mejorada */}
                        <Box
                            sx={{
                                mb: 4,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                border: "1px solid #e0e0e0",
                                borderRadius: 2,
                                p: 2
                            }}
                        >
                            {/* Button for uploading the photo */}
                            <label htmlFor="profile-picture-input">
                                <Button variant="contained" color="primary" component="span"
                                        startIcon={<CloudUpload />} sx={{ textTransform: "none" }}>
                                    Change profile picture
                                </Button>
                                <input id="profile-picture-input" type="file" accept="image/*"
                                        hidden onChange={handleProfilePictureChange} />
                            </label>

                            {profilePictureError && (
                                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                    {profilePictureError}
                                </Typography>
                            )}
                        </Box>

                        {/* Campo para cambiar el nombre de usuario */}
                        <TextField
                            fullWidth
                            label="Username"
                            name="username"
                            value={profileData.username}
                            onChange={handleChange}
                            disabled={!editingAccount}
                        />

                        {/* Botones para editar o guardar el nombre de usuario */}
                        <Box className="action-button" sx={{ mt: 2 }}>
                            {editingAccount ? (
                                <Button variant="contained" startIcon={<Save />} onClick={handleSaveUsername}>
                                    Save Username
                                </Button>
                            ) : (
                                <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditingAccount(true)}>
                                    Edit Username
                                </Button>
                            )}
                        </Box>
                    </Box>
                )}


                {/* Pestaña Security */}
                {tabIndex === 1 && (
                    <Box className="form-section">
                        <TextField
                            fullWidth
                            label="Actual password"
                            name="currentPassword"
                            type="password"
                            value={profileData.currentPassword}
                            onChange={handleChange}
                            disabled={!editingPassword}
                        />
                        <TextField
                            fullWidth
                            label="New password"
                            name="newPassword"
                            type="password"
                            value={profileData.newPassword}
                            onChange={handleChange}
                            disabled={!editingPassword}
                        />
                        <TextField
                            fullWidth
                            label="Confirm new password"
                            name="confirmPassword"
                            type="password"
                            value={profileData.confirmPassword}
                            onChange={handleChange}
                            disabled={!editingPassword}
                        />
                        <Box className="action-button" sx={{ mt: 2 }}>
                            {editingPassword ? (
                                <Button variant="contained" startIcon={<Save />} onClick={handleSavePassword}>
                                    Save Password
                                </Button>
                            ) : (
                                <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditingPassword(true)}>
                                    Edit Password
                                </Button>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Pestaña 2FA */}
                {tabIndex === 2 && (
                    <Card className="twofa-card">
                        <CardHeader title="2-step authentication" />
                        <CardContent>
                            <Typography variant="body1">Add an extra layer of security.</Typography>
                            <Box className="twofa-option">
                                <VerifiedUser className="twofa-icon" />
                                <Typography variant="subtitle1" className="twofa-option-text">
                                    Application
                                </Typography>
                                {qrCodeUrl ? (
                                    <QrCode imgUrl={qrCodeUrl} />
                                ) : (
                                    <Button
                                        name="Configure 2FA"
                                        variant="contained"
                                        color="primary"
                                        onClick={setup2FA}
                                    >
                                        {already2fa ? "Reset 2FA" : "Configure 2FA"}
                                    </Button>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {/* Notificaciones Snackbar */}
                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={3000}
                    onClose={() => setOpenSnackbar(false)}
                    message={snackbarMessage}
                />
            </CardContent>
        </Card>
    );
}

ProfileForm.propTypes = {
    username: PropTypes.string.isRequired,
    profilePicture: PropTypes.string,
    onSave: PropTypes.func.isRequired,
};
