// src/components/Navbar.js
import React, { useState } from "react";
import PropTypes from "prop-types";
import { AppBar, Toolbar, Avatar, IconButton, Button, Box, Typography, Dialog } from "@mui/material";
import { Logout as LogoutIcon, Person as PersonIcon } from "@mui/icons-material";
import "../../../styles/Navbar.css";
import ProfileForm from "./ProfileForm"; 

const Navbar = ({ username }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false); // Estado para abrir/cerrar ProfileForm

    const handleProfileClick = () => {
        setIsProfileOpen(true); // Abrir ProfileForm
    };

    const handleCloseProfile = () => {
        setIsProfileOpen(false); // Cerrar ProfileForm
    };

    const handleSaveProfile = (profileData) => {
        setIsProfileOpen(false); // Cerrar el formulario después de guardar
    };

    const handleLogout = () => {
        // Lógica para cerrar sesión
    };

    return (
        <>
            <AppBar position="sticky" className="app-bar">
                <Toolbar className="toolbar">
                    <Box className="navbar-left">
                        <Avatar className="logo-avatar">Wi</Avatar>
                        <Typography variant="h6" className="app-title">
                            WiChat
                        </Typography>
                    </Box>

                    <Box className="spacer" />

                    <Box className="user-section">
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<PersonIcon />}
                            onClick={handleProfileClick}
                            className="navbar-profile-button"
                        >
                            Profile
                        </Button>

                        <IconButton onClick={handleLogout}>
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Dialog para el formulario de perfil */}
            <Dialog open={isProfileOpen} onClose={handleCloseProfile} maxWidth="sm" fullWidth>
                <ProfileForm onSave={handleSaveProfile} />
            </Dialog>
        </>
    );
};

Navbar.propTypes = {
    username: PropTypes.string.isRequired,
};

export default Navbar;
