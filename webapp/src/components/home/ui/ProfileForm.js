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

    const [editingAccount, setEditingAccount] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    // 2FA
    const [already2fa, setAlready2fa] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);

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

    const getToken = () => {
        const cookieToken = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];
        return cookieToken || localStorage.getItem("token");
    };

    const handleSaveUsername = async () => {
        if (profileData.username === username) {
            setSnackbarMessage("No se detectaron cambios en el nombre de usuario.");
            setOpenSnackbar(true);
            return;
        }

        try {
            const token = getToken();
            const payload = { newUsername: profileData.username };

            const response = await fetch(`${apiEndpoint}/users/${username}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error actualizando el nombre de usuario");
            }

            const responseData = await response.json();
            const updatedToken = responseData.token;

            // Update the cookie with the new token 
            document.cookie = `token=${updatedToken}; path=/; max-age=3600`; 
            setProfileData((prev) => ({ ...prev, username: profileData.username })); 

            setSnackbarMessage("Nombre de usuario actualizado correctamente.");
            setOpenSnackbar(true);
            setEditingAccount(false);

            onSave({ ...profileData, username: profileData.username });

            // Reload the page to reflect the new username
            window.location.reload(); 

        } catch (error) {
            console.error("Error al actualizar el nombre de usuario:", error);
            setSnackbarMessage(`Error: ${error.message}`);
            setOpenSnackbar(true);
        }
    };

    const handleSavePassword = async () => {
        if (!profileData.newPassword) {
            setSnackbarMessage("Por favor, ingresa una nueva contraseña.");
            setOpenSnackbar(true);
            return;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
            setSnackbarMessage("La nueva contraseña y su confirmación no coinciden.");
            setOpenSnackbar(true);
            return;
        }
        if (!profileData.currentPassword) {
            setSnackbarMessage("Por favor, ingresa tu contraseña actual.");
            setOpenSnackbar(true);
            return;
        }

        try {
            const token = getToken();

            const payload = { 
                password: profileData.newPassword, 
                currentPassword: profileData.currentPassword 
            };

            const response = await fetch(`${apiEndpoint}/users/${username}/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error actualizando la contraseña");
            }

            setSnackbarMessage("Contraseña actualizada correctamente.");
            setOpenSnackbar(true);
            setEditingPassword(false);
         
            setProfileData((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));

            onSave({ ...profileData });
        } catch (error) {
            console.error("Error al actualizar la contraseña:", error);
            setSnackbarMessage(`Error: ${error.message}`);
            setOpenSnackbar(true);
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
            console.error("Error al configurar 2FA:", error);
            setSnackbarMessage(`Error al configurar 2FA: ${error.message}`);
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
                throw new Error("Se recibió una respuesta vacía.");
            }

            const data = JSON.parse(responseText);
            setAlready2fa(!!data.twoFactorEnabled);
        } catch (error) {
            console.error("Error al consultar el estado de 2FA:", error);
            setSnackbarMessage(`Error al consultar 2FA: ${error.message}`);
            setOpenSnackbar(true);
        }
    };

    useEffect(() => {
        check2FAStatus();
    }, [username]);

    return (
        <Card className="profile-container">
            <CardContent>
                {/* Header with Avatar and Name */}
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

                {/* Account */}
                {tabIndex === 0 && (
                    <Box component="form" className="form-section">
                        <TextField
                            fullWidth
                            label="Username"
                            name="username"
                            value={profileData.username}
                            onChange={handleChange}
                            disabled={!editingAccount}
                        />
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
    onSave: PropTypes.func.isRequired,
};
