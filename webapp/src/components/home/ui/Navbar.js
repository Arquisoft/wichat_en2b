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
import ConnectWithoutContactOutlinedIcon from '@mui/icons-material/ConnectWithoutContactOutlined';
import PlayCircleFilledWhiteOutlinedIcon from '@mui/icons-material/PlayCircleFilledWhiteOutlined';

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

    const handleCreateCodeGame = () => {
        router.push("/wihoot/create");
    }

    const handleJoinCodeame = () => {
        router.push("/wihoot/join");
    }

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

                    <Box className="user-section">
                        {/*Join Game Code*/}
                        <Button
                            id={'navbar-join-game-button'}
                            onClick={handleJoinCodeame}
                            variant={"contained"}
                            color="primary"
                            startIcon={<ConnectWithoutContactOutlinedIcon />}
                            className="joingame"
                            aria-label="Join Game"
                            size="small"
                        >
                            Join Game
                        </Button>

                        {/*Create Game Code*/}
                        { isGuest && (
                            <Button
                                id={'navbar-create-game-button'}
                            onClick={handleCreateCodeGame}
                            variant={"contained"}
                            color="primary"
                            startIcon={<PlayCircleFilledWhiteOutlinedIcon />}
                            className="creategame"
                            aria-label="Start Game Session"
                            size="small"
                            >
                            Start Session
                            </Button>
                        )}

                    </Box>

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