import React, {useEffect, useState} from "react";
import PropTypes from "prop-types";
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
    CircularProgress,
    Alert,
} from "@mui/material"
import "../../../styles/home/LeaderboardTab.css";
const gatewayService = process.env.GATEWAY_SERVICE_URL || "http://localhost:8000";
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

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);

            try{
                const token = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("token="))
                    ?.split("=")[1];
                if (!token) {
                    throw new Error('No authentication token found');
                }
                const endpoint = "/leaderboard";

                const response = await fetch(`${gatewayService}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`, // review how it is saved
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch leaderboard');
                }
                const data = await response.json();
                console.log(data);
                if (!data || !data.leaderboard) {
                    throw new Error('Invalid leaderboard data');
                }

                const currentPlayerId = await getCurrentPlayerId(token)
                setPlayer(currentPlayerId);

                setLeaderboard(data.leaderboard);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, [])
    const getCurrentPlayerId = async (token) => {
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            return decoded.username;
        } catch (error) {
            console.error('Error getting current player ID:', error);
            return null;
        }
    }
    if (loading) {
        return (
            <Card className="card-root">
                <CardHeader className="card-header" title="Leaderboard" />
                <CardContent className="card-content" style={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="card-root">
                <CardHeader className="card-header" title="Leaderboard" />
                <CardContent className="card-content">
                    <Alert severity="error">{error}</Alert>
                </CardContent>
            </Card>
        )
    }
    return (
        <Card className="card-root">
            <CardHeader className="card-header" title="Leaderboard" />

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
                            {leaderboard &&
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
                                                        {entry._id} (You)
                                                    </Typography>
                                                ) : (
                                                    entry._id
                                                )}
                                            </TableCell>
                                            <TableCell align="right">{entry.totalScore.toLocaleString()}</TableCell>
                                            <TableCell align="right">{entry.totalGames}</TableCell>
                                            <TableCell align="right">{entry.avgScore.toFixed(2)}</TableCell>
                                        </TableRow>
                                    )
                                })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    )
}
