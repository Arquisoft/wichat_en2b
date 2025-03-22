import React, { useState } from "react";
import PropTypes from "prop-types";
import { AppBar, Toolbar, Avatar, IconButton, Button, Box, Typography, Dialog } from "@mui/material";
import { Logout as LogoutIcon, Person as PersonIcon } from "@mui/icons-material";
import Link from "next/link"; 
import "../../../styles/home/Navbar.css";
import ProfileForm from "./ProfileForm";

const Navbar = ({ username }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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

    return (
      <>
        <AppBar position="sticky" className="app-bar">
          <Toolbar className="toolbar">
            <Box className="navbar-left" onClick={handleLogoClick}>
              <Avatar className="logo-avatar">Wi</Avatar>
              <Typography variant="h6" className="app-title">WiChat</Typography>              
            </Box>

            <Box className="spacer" />

            {/* Profile button */}
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

              {/* Logout button */}
              <Link href="/login" passHref>
                <IconButton>
                  <LogoutIcon />
                </IconButton>
              </Link>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Dialog for profile form */}
        <Dialog open={isProfileOpen} onClose={handleCloseProfile} maxWidth="sm" fullWidth>
          <ProfileForm username={username} onSave={handleSaveProfile} />
        </Dialog>
      </>
    );
};

// Validation with PropTypes for the username prop
Navbar.propTypes = {
  username: PropTypes.string.isRequired,
};

export default Navbar;
