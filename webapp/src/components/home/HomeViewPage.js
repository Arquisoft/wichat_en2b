import React, { useState, useEffect } from "react";
import { Container, Box, Typography, Tabs, Tab } from "@mui/material";
import { EmojiEvents as TrophyIcon, BarChart as StatsIcon, Psychology as BrainIcon } from "@mui/icons-material";
import GroupsIcon from '@mui/icons-material/Groups';
import PlayTab from "./ui/PlayTab";
import StatsTab from "./ui/StatsTab";
import LeaderboardTab from "./ui/LeaderboardTab";
import StatisticsCard from "./ui/StatisticsCard";
import "../../styles/home/HomePage.css";
import Navbar from "./ui/Navbar";
import "../../styles/Footer.css";
import axios from "axios"; 
import GroupPage from "./ui/GroupPage"; 

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

/**
 * Displays the home view of the application.
 * 
 * @returns {JSX.Element} The rendered component.
 */
function HomePage() {
    const [username, setUsername] = useState("");   
    const [profilePicture, setProfilePicture] = useState(""); 

    const [tabValue, setTabValue] = useState(0);
    const [currentYear, setCurrentYear] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
          const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];
    
          if (!token) return;
    
          try {
            // Fetch username
            const userResponse = await axios.get(`${apiEndpoint}/token/username`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            setUsername(userResponse.data.username);
            
            // Fetch profile picture after username is fetched
            const imgRes = await fetch(`${apiEndpoint}/user/profile/picture/${userResponse.data._id}`);
            if (imgRes.ok) {
              const imgURL = await imgRes.json();
              if(imgURL?.profilePicture) {
                // Set the profile picture URL
                setProfilePicture(`${apiEndpoint}/${imgURL.profilePicture}`);
              }
            } else {
              console.error("Failed to fetch profile picture.");
            }
            
          } catch (error) {
              setUsername(null); // Set username to null if there's an error
              console.error("Error fetching data:", error);
              return;
          }
        };
    
        fetchData();
    
        setCurrentYear(new Date().getFullYear()); // For footer
        return () => clearTimeout(10); // Cleanup
      }, []); 

    // Change tab value when clicked
    const handleTabChange = (_, newValue) => setTabValue(newValue);

    return (
        <Box className="home-container">

            {/* Navbar */}
            <div className="navbar-container">
                <Navbar username={username || ""} profilePicture={profilePicture || ""} />
            </div>

            <Container maxWidth="lg" className="home-content">
                    <Typography variant="h4" id='name-page' component="h1" align="center" gutterBottom>
                            WiChat
                    </Typography>

                    <Typography variant="subtitle1" color="textSecondary" align="center" sx={{ mb: 3 }}>
                        Connect, Learn, and Play with WiChat
                    </Typography>

                    {/* Pass the stats to the stats component */}
                    <StatisticsCard />

                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange}
                        variant="fullWidth" 
                        className="tabs-container"
                    >
                        <Tab icon={<BrainIcon />} label="Play" className="tab-content" />
                        <Tab icon={<StatsIcon />} label="Stats" className="tab-content" id='tab-statistics'/>
                        <Tab icon={<TrophyIcon />} label="Leaderboard" className="tab-content" />
                        <Tab icon={<GroupsIcon />} label="Groups" className="tab-content" />
                    </Tabs>

                    {tabValue === 0 && <PlayTab />}
                    {tabValue === 1 && <StatsTab />}
                    {tabValue === 2 && <LeaderboardTab />}
                    {tabValue === 3 && <GroupPage />}
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

export default HomePage;