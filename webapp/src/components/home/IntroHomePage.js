import React, { useState } from "react";
import {
    Container,
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@mui/material";
import { PlayArrow as PlayIcon } from "@mui/icons-material";
import Navbar from "./ui/Navbar";
import "../../styles/home/IntroHomePage.css";

function IntroHomePage() {
    const [openDialog, setOpenDialog] = useState(false);
    const currentYear = new Date().getFullYear();

    const handlePlayClick = () => {
        setOpenDialog(true);
    };

    const handlePlayNow = () => {
        setOpenDialog(false);
        window.location.href = "/guest/home";
    };

    const handleLogin = () => {
        setOpenDialog(false);
        window.location.href = "/login";
    };

    const handleRegister = () => {
        setOpenDialog(false);
        window.location.href = "/addUser";
    };

    return (
        <Box className="intro-home-container">
            <Container maxWidth="lg" className="intro-home-content">
                {/* Hero Section */}
                <Box className="hero-section text-center">
                    <Typography variant="h2" component="h1" gutterBottom className="hero-title">
                        Welcome to WiChat
                    </Typography>
                    <Typography variant="h5" color="textSecondary" className="hero-subtitle">
                        Connect, Learn, and Play with engaging quizzes!
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<PlayIcon />}
                        className="play-now-button"
                        onClick={handlePlayClick}
                        data-testid="play-now-button"
                    >
                        Play Now
                    </Button>
                </Box>

                {/* Call-to-Action Section */}
                <Box className="cta-section">
                    <Button
                        variant="outlined"
                        color="primary"
                        size="large"
                        onClick={handleLogin}
                        className="cta-button"
                        data-testid="cta-login-button"
                    >
                        Login
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        size="large"
                        onClick={handleRegister}
                        className="cta-button"
                        data-testid="cta-register-button"
                    >
                        Register
                    </Button>
                </Box>
            </Container>

            {/* Dialog Prompt */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                PaperProps={{ className: "dialog-container" }}
            >
                <DialogTitle className="dialog-title">
                    Play as Guest
                </DialogTitle>
                <DialogContent className="dialog-content">
                    You are about to play anonymously. Would you like to log in or register for a better experience?
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button
                        onClick={handlePlayNow}
                        className="dialog-button"
                        data-testid="dialog-play-guest-button"
                    >
                        Play as Guest
                    </Button>
                    <Button
                        onClick={handleLogin}
                        className="dialog-button"
                        data-testid="dialog-login-button"
                    >
                        Login
                    </Button>
                    <Button
                        onClick={handleRegister}
                        className="dialog-button"
                        data-testid="dialog-register-button"
                    >
                        Register
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default IntroHomePage;