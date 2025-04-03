import React, { useState } from "react";
import { Container, Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { PlayArrow as PlayIcon } from "@mui/icons-material";
import Navbar from "./ui/Navbar";
import "../../styles/home/IntroHomePage.css";

/**
 * Displays the introductory home view for anonymous users.
 * 
 * @returns {JSX.Element} The rendered component.
 */
function IntroHomePage() {
    const [openDialog, setOpenDialog] = useState(false);
    const currentYear = new Date().getFullYear();

    const handlePlayClick = () => {
        setOpenDialog(true);
    };

    const handlePlayNow = () => {
        setOpenDialog(false);
        window.location.href = "/play";
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
            {/* Navbar */}
            <div className="navbar-container">
                <Navbar />
            </div>

            <Container maxWidth="lg" className="intro-home-content">
                {/* Hero Section */}
                <Box className="hero-section" textAlign="center" sx={{ py: 6 }}>
                    <Typography variant="h2" component="h1" gutterBottom className="hero-title">
                        Welcome to WiChat
                    </Typography>
                    <Typography variant="h5" color="textSecondary" sx={{ mb: 4 }} className="hero-subtitle">
                        Connect, Learn, and Play with engaging quizzes!
                    </Typography>

                    {/* Large Play Button */}
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<PlayIcon />}
                        sx={{
                            fontSize: "1.5rem",
                            px: 4,
                            py: 2,
                            borderRadius: "50px",
                            boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
                            backgroundColor: "#7d3cff", // Purple color
                            "&:hover": {
                                backgroundColor: "#6c2eb5", // Darker purple on hover
                            },
                        }}
                        onClick={handlePlayClick}
                    >
                        Play Now
                    </Button>
                </Box>

                {/* Call-to-Action Section */}
                <Box display="flex" justifyContent="center" gap={2} sx={{ mt: 6 }}>
                    <Button variant="outlined" color="primary" size="large" onClick={handleLogin} sx={{ borderColor: "#7d3cff", color: "#7d3cff" }}>
                        Login
                    </Button>
                    <Button variant="outlined" color="secondary" size="large" onClick={handleRegister} sx={{ borderColor: "#7d3cff", color: "#7d3cff" }}>
                        Register
                    </Button>
                </Box>
            </Container>

            {/* Dialog Prompt */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} PaperProps={{ sx: { backgroundColor: "#f0f0f0", borderRadius: "10px" } }}>
                <DialogTitle sx={{ backgroundColor: "#7d3cff", color: "white", padding: "1rem", borderRadius: "10px 10px 0 0" }}>
                    Play as Guest
                </DialogTitle>
                <DialogContent sx={{ padding: "2rem" }}>
                    You are about to play anonymously. Would you like to log in or register for a better experience?
                </DialogContent>
                <DialogActions sx={{ padding: "1rem", justifyContent: "space-between" }}>
                    <Button onClick={handlePlayNow} sx={{ backgroundColor: "#7d3cff", color: "white", "&:hover": { backgroundColor: "#6c2eb5" } }}>
                        Play as Guest
                    </Button>
                    <Button onClick={handleLogin} sx={{ backgroundColor: "#7d3cff", color: "white", "&:hover": { backgroundColor: "#6c2eb5" } }}>
                        Login
                    </Button>
                    <Button onClick={handleRegister} sx={{ backgroundColor: "#7d3cff", color: "white", "&:hover": { backgroundColor: "#6c2eb5" } }}>
                        Register
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Footer */}
            <div className="footer-container">
                <footer className={`footer`} style={{ backgroundColor: "#333", color: "white", padding: "1rem", textAlign: "center" }}>
                    &copy; {currentYear} WiChat. All rights reserved.
                </footer>
            </div>
        </Box>
    );
}

export default IntroHomePage;
