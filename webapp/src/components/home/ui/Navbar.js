"use client";

import React, { useState } from "react";
import PropTypes from "prop-types";
import {
    AppBar,
    Toolbar,
    Avatar,
    IconButton,
    Button,
    Box,
    Typography,
    Dialog
} from "@mui/material";
import {
    Logout as LogoutIcon,
    Person as PersonIcon
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import "../../../styles/home/Navbar.css";
import ProfileForm from "./ProfileForm";

let isGuest = false;

const Navbar = ({ username = "Guest", profilePicture }) => {
    if (!username || username === "") {
        username = "Guest";
        isGuest = true;
    }

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const router = useRouter();

    const handleLogoClick = () => {
        window.location.reload();
    };

    const handleProfileClick = () => {
        setIsProfileOpen(true);
    };

    const handleCloseProfile = () => {
        setIsProfileOpen(false);
    };

    const handleSaveProfile = (profileData) => {
        setIsProfileOpen(false); // To be updated with actual save logic
    };

    const handleLogout = () => {
        document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
        window.location.href = "/";
    };

    return (
        <>
            <AppBar position="sticky" className="app-bar">
                <Toolbar className="toolbar">
                    <Box className="navbar-left" onClick={handleLogoClick}>
                        <Avatar className="logo-avatar" src={profilePicture || ""}>
                            {!profilePicture && "Wi"}
                        </Avatar>
                        {isGuest ? (
                            <Typography variant="h6" className="app-title">
                                WiChat - {username}
                            </Typography>
                        ) : (
                            <Typography variant="h6" className="app-title">
                                WiChat
                            </Typography>
                        )}
                    </Box>

                    <Box className="spacer" />

                    {isGuest ? (
                        <Box className="user-section">
                            <Button
                                id="navbar-profile-button"
                                variant="contained"
                                color="secondary"
                                startIcon={<PersonIcon />}
                                onClick={handleProfileClick}
                                className="navbar-profile-button"
                            >
                                Profile
                            </Button>

                            <IconButton
                                aria-label="logout"
                                onClick={handleLogout}
                                className="logout-button"
                            >
                                <LogoutIcon />
                            </IconButton>
                        </Box>
                    ) : (
                        <Box className="user-section">
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => (router.push("/login"))}
                                className="login-button"
                            >
                                Login
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => (router.push("/addUser"))}
                                className="register-button"
                            >
                                Register
                            </Button>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Dialog
                open={isProfileOpen}
                onClose={handleCloseProfile}
                maxWidth="sm"
                fullWidth
            >
                <ProfileForm
                    username={username}
                    profilePicture={profilePicture}
                    onSave={handleSaveProfile}
                />
            </Dialog>
        </>
    );
};

Navbar.propTypes = {
    username: PropTypes.string.isRequired,
    profilePicture: PropTypes.string
};

export default Navbar;