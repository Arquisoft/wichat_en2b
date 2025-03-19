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

export default function HomePage() {
    const [username] = useState("QuizMaster");
    const [progress, setProgress] = useState(0);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setProgress(78), 500);
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

                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab icon={<BrainIcon />} label="Play" />
                        <Tab icon={<StatsIcon />} label="Stats" />
                        <Tab icon={<TrophyIcon />} label="Leaderboard" />
                    </Tabs>

                    {tabValue === 0 && <PlayTab />}
                    {tabValue === 1 && <StatsTab recentQuizzes={recentQuizzes} />}
                    {tabValue === 2 && <LeaderboardTab leaderboardData={leaderboardData} />}
            </Container>
        </Box>
    );
}
