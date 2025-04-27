"use client";

import React, { useState } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/navigation";
import "../../../styles/home/Navbar.css";
import ProfileForm from "./ProfileForm";
import ConnectWithoutContactOutlinedIcon from '@mui/icons-material/ConnectWithoutContactOutlined';
import PlayCircleFilledWhiteOutlinedIcon from '@mui/icons-material/PlayCircleFilledWhiteOutlined';
import MenuIcon from '@mui/icons-material/Menu';

import {
    AppBar,
    Toolbar,
    Avatar,
    IconButton,
    Button,
    Box,
    Typography,
    Dialog,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
} from "@mui/material";

import {
    Logout as LogoutIcon,
    Person as PersonIcon
} from "@mui/icons-material";

const Navbar = ({ username = "Guest", profilePicture }) => {
    const isGuest = !username || username === "" || username === "Guest";
    const effectiveUsername = isGuest ? "Guest" : username;
    
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
    const router = useRouter();

    const handleLogoClick = () => {
        window.location.reload();
    };

    const handleProfileClick = () => {
        setIsProfileOpen(true);
        handleMobileMenuClose();
    };

    const handleCloseProfile = () => {
        setIsProfileOpen(false);
    };

    const handleSaveProfile = (profileData) => {
        setIsProfileOpen(false); 
    };

    const handleLogout = () => {
        document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
        window.location.href = "/";
        handleMobileMenuClose();
    };

    const handleCreateCodeGame = () => {
        router.push("/wihoot/create");
        handleMobileMenuClose();
    };

    const handleJoinCodeame = () => {
        router.push("/wihoot/join");
        handleMobileMenuClose();
    };

    const handleMobileMenuOpen = (event) => {
        setMobileMenuAnchor(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setMobileMenuAnchor(null);
    };

    // Menu items for guest users
    const guestMenuItems = [
        <MenuItem key="join" onClick={handleJoinCodeame}>
            <ListItemIcon>
                <ConnectWithoutContactOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Join Game</ListItemText>
        </MenuItem>,
        <MenuItem key="start" onClick={handleCreateCodeGame}>
            <ListItemIcon>
                <PlayCircleFilledWhiteOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Start Session</ListItemText>
        </MenuItem>,
        <MenuItem key="profile" onClick={handleProfileClick}>
            <ListItemIcon>
                <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
        </MenuItem>,
        <MenuItem key="logout" onClick={handleLogout}>
            <ListItemIcon>
                <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
        </MenuItem>
    ];

    // Menu items for non-guest users
    const nonGuestMenuItem = [
        <MenuItem key="exit" onClick={() => router.push("/")}>
            <ListItemText>Exit</ListItemText>
        </MenuItem>
    ];

    return (
        <>
            <AppBar position="sticky" className="app-bar">
                <Toolbar className="toolbar">
                    <Box className="navbar-left" onClick={handleLogoClick}>
                        <Avatar className="logo-avatar" src={profilePicture || ""}>
                            {!profilePicture && "Wi"}
                        </Avatar>
                        {!isGuest ? (
                            <Typography variant="h6" className="app-title">
                                WiChat - {effectiveUsername}
                            </Typography>
                        ) : (
                            <Typography variant="h6" className="app-title">
                                WiChat
                            </Typography>
                        )}
                    </Box>

                    <Box className="spacer" />

                    {/* Desktop Navigation */}
                    <Box className="user-section desktop-only">
                        {!isGuest ? (
                            <>
                                <Button
                                    id={'navbar-join-game-button'}
                                    onClick={handleJoinCodeame}
                                    variant="contained"
                                    color="primary"
                                    startIcon={<ConnectWithoutContactOutlinedIcon />}
                                    className="joingame"
                                    aria-label="Join Game"
                                >
                                    <span className="button-text">Join Game</span>
                                </Button>

                                <Button
                                    id={'navbar-create-game-button'}
                                    onClick={handleCreateCodeGame}
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PlayCircleFilledWhiteOutlinedIcon />}
                                    className="creategame"
                                    aria-label="Start Game Session"
                                >
                                    <span className="button-text">Start Session</span>
                                </Button>

                                <Button
                                    id="navbar-profile-button"
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<PersonIcon />}
                                    onClick={handleProfileClick}
                                    className="navbar-profile-button"
                                >
                                    <span className="button-text">Profile</span>
                                </Button>

                                <IconButton
                                    aria-label="logout"
                                    onClick={handleLogout}
                                    className="logout-button"
                                >
                                    <LogoutIcon />
                                </IconButton>
                            </>
                        ) : (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => (router.push("/"))}
                                className="login-button"
                            >
                                Exit
                            </Button>                            
                        )}
                    </Box>

                    {/* Mobile Hamburger Menu */}
                    <Box className="mobile-only">
                        <IconButton
                            size="large"
                            edge="end"
                            color="inherit"
                            aria-label="menu"
                            onClick={handleMobileMenuOpen}
                        >
                            <MenuIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Mobile Menu Popup - Using arrays instead of fragments */}
            <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleMobileMenuClose}
                className="mobile-menu-popup"
            >
                {!isGuest ? guestMenuItems : nonGuestMenuItem}
            </Menu>

            <Dialog
                open={isProfileOpen}
                onClose={handleCloseProfile}
                maxWidth="sm"
                fullWidth
            >
                <ProfileForm
                    username={effectiveUsername}
                    profilePicture={profilePicture}
                    onSave={handleSaveProfile}
                />
            </Dialog>
        </>
    );
};

Navbar.propTypes = {
    username: PropTypes.string,
    profilePicture: PropTypes.string
};

export default Navbar;