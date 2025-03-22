import React, { useState, useEffect } from "react";
import { Container, Box, Typography, Tabs, Tab } from "@mui/material";
import { EmojiEvents as TrophyIcon, BarChart as StatsIcon, Psychology as BrainIcon } from "@mui/icons-material";
import PlayTab from "./ui/PlayTab";
import StatsTab from "./ui/StatsTab";
import LeaderboardTab from "./ui/LeaderboardTab";
import StatisticsCard from "./ui/StatisticsCard";
import { recentQuizzes, leaderboardData } from "./data";
import "../../styles/home/HomePage.css";
import Navbar from "./ui/Navbar";
import "../../styles/Footer.css";

/**
 * Displays the home view of the application.
 * 
 * @param {String} username         - The username of the player.
 * @param {JSON} stats              - The statistics of the player.
 * 
 * @returns {JSX.Element} The rendered component.
 */
export default function HomePage({ username, stats }) {
    if (!username) {
        username = "QuizMaster";
    }

    if (!stats) {
        stats = {
            quizzes: 42,     // Ejemplo: número de quizzes
            accuracy: 78,    // Ejemplo: porcentaje de precisión
            rank: 12         // Ejemplo: rango del jugador
        };
    }

    const [tabValue, setTabValue] = useState(0);
    const [currentYear, setCurrentYear] = useState(null);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear()); // For footer
        return () => clearTimeout(10); // Cleanup
    }, []);

    // Change tab value when clicked
    const handleTabChange = (_, newValue) => setTabValue(newValue);

    return (
        <Box className="home-container">

            {/* Navbar */}
            <div className="navbar-container">
                <Navbar username={username} />
            </div>

            <Container maxWidth="lg" className="home-content">
                    <Typography variant="h4" component="h1" align="center" gutterBottom>
                            WiChat
                    </Typography>

                    <Typography variant="subtitle1" color="textSecondary" align="center" sx={{ mb: 3 }}>
                        Connect, Learn, and Play with WiChat
                    </Typography>

                    {/* Pass the stats to the stats component */}
                    <StatisticsCard stats={stats} />

                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange}
                        variant="fullWidth" 
                        className="tabs-container"
                    >
                        <Tab icon={<BrainIcon />} label="Play" className="tab-content" />
                        <Tab icon={<StatsIcon />} label="Stats" className="tab-content" />
                        <Tab icon={<TrophyIcon />} label="Leaderboard" className="tab-content" />
                    </Tabs>

                    {tabValue === 0 && <PlayTab />}
                    {tabValue === 1 && <StatsTab recentQuizzes={recentQuizzes} />}
                    {tabValue === 2 && <LeaderboardTab leaderboardData={leaderboardData} />}
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
