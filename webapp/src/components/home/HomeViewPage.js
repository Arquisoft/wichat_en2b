import React, { useState, useEffect } from "react";
import { Container, Box, Typography, Tabs, Tab } from "@mui/material";
import { EmojiEvents as TrophyIcon, BarChart as StatsIcon, Psychology as BrainIcon } from "@mui/icons-material";
import PlayTab from "./ui/PlayTab";
import StatsTab from "./ui/StatsTab";
import LeaderboardTab from "./ui/LeaderboardTab";
import ProgressCard from "./ui/ProgressBar";
import { recentQuizzes, leaderboardData } from "./data";
import "../../styles/HomePage.css";
import Navbar from "./ui/Navbar";
import "../../styles/Footer.css";

export default function HomePage() {
    const [username] = useState("QuizMaster");
    const [progress, setProgress] = useState(0);
    const [tabValue, setTabValue] = useState(0);
    const [currentYear, setCurrentYear] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setProgress(78), 500);
        setCurrentYear(new Date().getFullYear()); 
        return () => clearTimeout(timer);
    }, []);


    const handleTabChange = (event, newValue) => setTabValue(newValue);

    return (
        <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh" }}>
            <Navbar username={username} />

            <Container maxWidth="lg" sx={{ py: 4, maxWidth: "100% !important" }}>
                    <Typography variant="h4" component="h1" align="center" gutterBottom>
                            WiChat
                    </Typography>

                    <Typography variant="subtitle1" color="textSecondary" align="center" sx={{ mb: 3 }}>
                        Connect, Learn, and Play with WiChat
                    </Typography>

                    <ProgressCard progress={progress} />

                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange}
                        variant="fullWidth" 
                        sx={{
                            boxShadow: 3, // Sombra gris
                            borderBottom: "1px solid #e0e0e0", // Línea de separación
                            bgcolor: "#ffffff", // Fondo blanco
                        }}
                    >
                        <Tab icon={<BrainIcon />} label="Play" sx={{ textTransform: "none" }} />
                        <Tab icon={<StatsIcon />} label="Stats" sx={{ textTransform: "none" }} />
                        <Tab icon={<TrophyIcon />} label="Leaderboard" sx={{ textTransform: "none" }} />
                    </Tabs>

                    {tabValue === 0 && <PlayTab />}
                    {tabValue === 1 && <StatsTab recentQuizzes={recentQuizzes} />}
                    {tabValue === 2 && <LeaderboardTab leaderboardData={leaderboardData} />}
            </Container>

            {/* Footer */}
            <footer className={`footer ${currentYear ? "" : "footer-dark"}`}>
                <div className="footer__content">
                    <div className="footer__brand">WiChat</div>
                    <div className="footer__text">
                        {currentYear ? `© ${currentYear} WiChat. All rights reserved.` : "Loading..."}
                    </div>
                </div>
            </footer>
        </Box>
    );
}
