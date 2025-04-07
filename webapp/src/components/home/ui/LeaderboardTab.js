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
    const [groupLeaderboard, setGroupLeaderboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [player, setPlayer] = useState(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [doesGroupExist, setDoesGroupExist] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);

            try {
                const data = await fetchWithAuth("/leaderboard");
                if (!data || !data.leaderboard) {
                    setError("No leaderboard data available.");
                }
                const token = getAuthToken();
                const currentPlayerId = await getCurrentPlayerId(token);

                setPlayer(currentPlayerId);
                console.log("Leaderboard data:", data.leaderboard);
                setLeaderboard(data.leaderboard);
            } catch (error) {
                setError(error.message || "Failed to fetch leaderboard data.");
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();

        const fetchGroupLeaderboard = async () => {
            setLoading(true);

            const token = getAuthToken();
            try {
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
                    setGroupLeaderboard(null);
                    setDoesGroupExist(false);
                    return setError("No group data available.");
                }
                setDoesGroupExist(true);

                const playerIds = group.members;
                console.log("Group members:", playerIds);

                const players = await axios.post(
                    `${apiEndpoint}/users/by-ids`,
                    { users: playerIds },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const playerNames = players.data.map((player) => player.username);
                console.log("Player names:", playerNames);

                const response = await axios.post(
                    `${apiEndpoint}/leaderboard/group`,
                    { players: playerNames },
                    {
                        headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        },
                    }
                );
                console.log("Group leaderboard data:", response.data.leaderboard);
                setGroupLeaderboard(response.data.leaderboard);
            } catch (error) {
                setGroupLeaderboard(null);
                if (error.response && error.response.status !== 404) {
                    setError(error.message || "Failed to fetch group leaderboard data.");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchGroupLeaderboard();
    }, [])
    return (
        <div className="leaderboard-tab">
            {/* Tabs */}
            <div className="tabs-container">
                <Tabs 
                    value={tabIndex} 
                    onChange={(e, newValue) => setTabIndex(newValue)} 
                    scrollButtons="auto"
                    variant="scrollable"
                    className={"tabs-header"}
                >
                    <Tab label="WiChat Leaderboard" icon={<PublicIcon/>} />
                    <Tab label="Group Leaderboard" icon={<GroupIcon />} />
                </Tabs>
            </div>
        
            {tabIndex === 0 && (
                <Card>
                <CardHeader title="WiChat Leaderboard" />
                <LoadingErrorHandler loading={loading} error={error}>
                    <CardContent className="card-content">
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
                    </CardContent>
                </LoadingErrorHandler>
                </Card>
            )}

            {tabIndex === 1 && (
                <div className="group-leaderboard">
                    {!doesGroupExist && (
                        <CardHeader title="You do not belong to any group!" />
                    )}

                    {doesGroupExist && (
                        <Card>
                        <CardHeader title="Group Leaderboard" />
                        <LoadingErrorHandler loading={loading} error={error}>
                        <CardContent className="card-content">
                            <CardContent className="card-content">
                                <TableContainer component={Paper}>
                                    <Table aria-label="group leaderboard table">
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
                                            {groupLeaderboard &&
                                                groupLeaderboard.map((entry) => {
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
                        </CardContent>
                    </LoadingErrorHandler>
                    </Card>
                    )}
                </div>
            )}
        </div>
    )
}
