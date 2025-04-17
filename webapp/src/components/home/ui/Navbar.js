"use client";

import React, { useState } from "react";
import PropTypes from "prop-types";
import { AppBar, Toolbar, Avatar, IconButton, Button, Box, Typography, Dialog } from "@mui/material";
import { Logout as LogoutIcon, Person as PersonIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import "../../../styles/home/Navbar.css";
import ProfileForm from "./ProfileForm";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';
let isGuest = false;
/**
 * Navigation bar for the application.
 *
 * @param {string} username - The username of the player (optional).
 *
 * @returns {JSX.Element} The rendered Navbar component.
 */
const Navbar = ({ username = "Guest", profilePicture }) => {
  console.log("Navbar component rendered with profilePicture:", profilePicture);
  if (!username || username === "") {
    username = "Guest"; 
    isGuest = true;
  }

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter(); // Use Next.js router for navigation

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
    setIsProfileOpen(false); // To be decided how this is managed
  };

  const handleLogout = () => {
    // Clear the token cookie
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
    // Redirect to /login
    window.location.href = "/";
  };

  return (
    <>
      <AppBar position="sticky" className="app-bar">
        <Toolbar className="toolbar">
          <Box className="navbar-left" onClick={handleLogoClick}>
            {/* Displaying the profile picture in the Avatar */}
            <Avatar className="logo-avatar" src={profilePicture || ""}>
              {!profilePicture && "Wi"} 
            </Avatar>
            {isGuest ? (
              <Typography variant="h6" className="app-title">WiChat - {username}</Typography>
            ) : (
              <Typography variant="h6" className="app-title">WiChat</Typography>
            )}
          </Box>

          <Box className="spacer" />

          {/* Conditional rendering based on guest or not */}
          {isGuest ? (
            <Box className="user-section">
              {/* Profile button */}
              <Button
                id={'navbar-profile-button'}
                variant="contained"
                color="secondary"
                startIcon={<PersonIcon />}
                onClick={handleProfileClick}
                className="navbar-profile-button"
              >
                Profile
              </Button>

              {/* Logout button */}
              <IconButton aria-label="logout" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Box>
          ) : (
            <Box className="user-section">
              {/* Buttons for anonymous users */}
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push("/login")}
                sx={{ marginRight: "1rem" }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => router.push("/register")}
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Dialog for profile form */}
      <Dialog open={isProfileOpen} onClose={handleCloseProfile} maxWidth="sm" fullWidth>
        <ProfileForm username={username} profilePicture={profilePicture} onSave={handleSaveProfile} />
      </Dialog>
    </>
  );
};

// Validation with PropTypes for the username prop
Navbar.propTypes = {
  username: PropTypes.string.isRequired,
  profilePicture: PropTypes.string,
};

export default Navbar;
