import React, { useState, useEffect } from "react";
import { Container, Box, Typography } from "@mui/material";
import PlayTab from "./ui/PlayTab";
import "../../styles/home/HomePage.css";
import Navbar from "./ui/Navbar";
import "../../styles/Footer.css";

/**
 * Guest view of the home page with limited functionality.
 *
 * @returns {JSX.Element} The rendered guest home component.
 */
function GuestHomePage() {
    const [tabValue] = useState(0);
    const [currentYear, setCurrentYear] = useState(null);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
        return () => clearTimeout(10);
    }, []);

    return (
        <Box className="home-container">
            {/* Navbar without username */}
            <div className="navbar-container">
                <Navbar />
            </div>

            <Container maxWidth="lg" className="home-content">
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    WiChat Guest Mode
                </Typography>

                <Typography
                    variant="subtitle1"
                    color="textSecondary"
                    align="center"
                    className="guest-subtitle"
                >
                    Play quizzes anonymously - scores won't be saved
                </Typography>

                {/* Only show PlayTab */}
                {tabValue === 0 && <PlayTab isGuest={true} />}
            </Container>

            {/* Footer */}
            <div className="footer-container">
                <footer className={`footer ${currentYear ? "" : "footer-dark"}`}>
                    <div className="footer__content">
                        <div className="footer__brand">WiChat</div>
                        <div className="footer__text">
                            {currentYear ? `© ${currentYear} WiChat. All rights reserved.` : "Loading..."}
                        </div>
                    </div>
                </footer>
            </div>
        </Box>
    );
}

export default GuestHomePage;