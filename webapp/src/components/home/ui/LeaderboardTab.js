import React, {useEffect, useState} from "react";
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import LoadingErrorHandler from ".//LoadingErrorHandler";
import {getAuthToken, getCurrentPlayerId} from "@/utils/auth";
import GroupIcon from '@mui/icons-material/Group';
import PublicIcon from '@mui/icons-material/Public';
import axios from "axios";
import {
    Card,
    CardHeader,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tabs,
    Tab
} from "@mui/material"
import "../../../styles/home/LeaderboardTab.css";
const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';
/**
 * Displays a leaderboard of players.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function LeaderboardTab() {
    const [leaderboard, setLeaderboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [player, setPlayer] = useState(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [doesGroupExist, setDoesGroupExist] = useState(false);
    const [usersLeaderboard, setUsersLeaderboard] = useState(null);

    const getUsernameById = (id) => {
        if (!usersLeaderboard) {
            return "Loading..."; // O algún texto de carga
        }
        
        if (Array.isArray(usersLeaderboard)) {
            const user = usersLeaderboard.find((u) => u._id === id || u.id === id);
            return user ? (user.username || "") : "";
        }
        
        // Si no es un array, podría ser un objeto con propiedades id/username
        return usersLeaderboard[id]?.username || "";
    };


    // Función principal para obtener el leaderboard global
    const fetchGlobalLeaderboard = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Obtener datos del leaderboard
            const data = await fetchWithAuth("/leaderboard");
            if (!data || !data.leaderboard) {
                setError("No leaderboard data available.");
                return;
            }
            
            // 2. Guardar los datos del leaderboard
            setLeaderboard(data.leaderboard);
            
            // 3. Obtener ID del jugador actual
            const token = getAuthToken();
            const currentPlayerId = await getCurrentPlayerId(token);
            setPlayer(currentPlayerId);
            
            // 4. Obtener usuarios para los IDs del leaderboard
            const userIds = data.leaderboard.map(entry => entry._id);
            await fetchUserDetails(userIds);
        } catch (error) {
            setError(error.message || "Failed to fetch leaderboard data.");
        } finally {
            setLoading(false);
        }
    };
    
    // Función principal para obtener el leaderboard de grupo
    const fetchGroupLeaderboard = async () => {
        setLoading(true);
        setError(null);
        
        const token = getAuthToken();
        try {
        // 1. Obtener datos del grupo
            const groupFetch = await axios.get(
                `${apiEndpoint}/groups/joined`,
                {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                }
            );
    
            const group = groupFetch.data;
            if (!group) {
                setLeaderboard(null);
                setDoesGroupExist(false);
                return;
            }
            setDoesGroupExist(true);
        
            // 2. Obtener leaderboard del grupo
            const playerIds = group.members;
            const response = await axios.post(
                `${apiEndpoint}/leaderboard/group`,
                { players: playerIds },
                {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                }
            );
        
            // 3. Guardar los datos del leaderboard
            const leaderboardData = response.data.leaderboard;
            setLeaderboard(leaderboardData);
            
            // 4. Obtener detalles de usuarios para el leaderboard
            const userIds = leaderboardData.map(entry => entry._id);
            await fetchUserDetails(userIds);
        } catch (error) {
            setLeaderboard(null);
            setError(error.message || "Failed to fetch group leaderboard data.");
        } finally {
            setLoading(false);
        }
    };
    
    // Función auxiliar para obtener detalles de usuarios
    const fetchUserDetails = async (userIds) => {
        if (!userIds || userIds.length === 0) {
            console.log("No user IDs to fetch");
            return;
        }
        
        try {            
            const response = await axios.post(
                `${apiEndpoint}/users/by-ids`,
                {users: userIds},
                {
                headers: {
                    "Content-Type": "application/json",
                },
                }
            );
            setUsersLeaderboard(response.data);
        } catch (error) {
            console.error("Error fetching leaderboard users:", error);
        }
    };
    
    // Tab handler simplificado
    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
        if (newValue === 0) {
            fetchGlobalLeaderboard();
        } else {
            fetchGroupLeaderboard();
        }
    };
    
    // useEffect para cargar datos iniciales
    useEffect(() => {
        fetchGlobalLeaderboard();
    }, []);


    return (
        <div className="leaderboard-tab">
            {/* Tabs */}
            <div className="tabs-container">
                <Tabs 
                    value={tabIndex} 
                    onChange={handleTabChange} 
                    scrollButtons="auto"
                    variant="scrollable"
                    className={"tabs-header"}
                >
                    <Tab label="WiChat Leaderboard" icon={<PublicIcon/>} />
                    <Tab label="Group Leaderboard" icon={<GroupIcon />} />
                </Tabs>
            </div>
        
            {tabIndex === 1 && (
                <div className="group-leaderboard">
                    {!doesGroupExist && (
                        <CardHeader title="You do not belong to any group!" />
                    )}
                </div>
            )}
            
            <Card>
            <CardHeader title="WiChat Leaderboard" />
            <LoadingErrorHandler loading={loading} error={error}>
                <CardContent className="card-content">
                    
                        <TableContainer component={Paper}>
                            <Table aria-label="leaderboard table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Rank</TableCell>
                                        <TableCell>Username</TableCell>
                                        <TableCell align="right">Total Score</TableCell>
                                        <TableCell align="right">Games Played</TableCell>
                                        <TableCell align="right">Average Score</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {leaderboard && usersLeaderboard && //NOSONAR
                                        leaderboard.map((entry) => {
                                            const isCurrentPlayer =
                                                player && (player === entry._id || (typeof player === "object" && player._id === entry._id))

                                            return (
                                                <TableRow
                                                    key={entry._id}
                                                    className={isCurrentPlayer ? "current-player" : ""}
                                                    sx={{
                                                        backgroundColor: isCurrentPlayer ? "rgba(144, 202, 249, 0.2)" : "inherit",
                                                        "&:hover": {
                                                            backgroundColor: isCurrentPlayer ? "rgba(144, 202, 249, 0.3)" : "rgba(0, 0, 0, 0.04)",
                                                        },
                                                    }}
                                                >
                                                    <TableCell>#{entry.rank}</TableCell>
                                                    <TableCell>
                                                        {isCurrentPlayer ? (
                                                            <Typography component="span" fontWeight="bold">
                                                                {getUsernameById(entry._id)} (You)
                                                            </Typography>
                                                        ) : (
                                                            getUsernameById(entry._id)
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">{`${entry.totalScore.toLocaleString()} points`}</TableCell>
                                                    <TableCell align="right">{entry.totalGames}</TableCell>
                                                    <TableCell align="right">{`${entry.avgScore.toFixed(1)} points`}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    
                </CardContent>
            </LoadingErrorHandler>
            </Card>
            
        </div>
    )
}
