"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import LoadingErrorHandler from "./LoadingErrorHandler";
import { getAuthToken, getCurrentPlayerId } from "@/utils/auth";
import GroupIcon from "@mui/icons-material/Group";
import PublicIcon from "@mui/icons-material/Public";
import PropTypes from "prop-types";
import "../../../styles/home/LeaderboardTab.css";
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
  Tab,
  Box,
  Alert,
} from "@mui/material";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

export default function LeaderboardTab() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [player, setPlayer] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [doesGroupExist, setDoesGroupExist] = useState(false);
  const [usersLeaderboard, setUsersLeaderboard] = useState(null);

  const getUsernameById = (id) => {
    if (!usersLeaderboard) return "Loading...";

    if (Array.isArray(usersLeaderboard)) {
      const user = usersLeaderboard.find((u) => u._id === id || u.id === id);
      return user ? user.username || "" : "";
    }

    return usersLeaderboard[id]?.username || "";
  };

  const fetchGlobalLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWithAuth("/leaderboard");
      if (!data?.leaderboard) {
        setError("No leaderboard data available.");
        return;
      }

      setLeaderboard(data.leaderboard);

      const token = getAuthToken();
      const currentPlayerId = await getCurrentPlayerId(token);
      setPlayer(currentPlayerId);

      const userIds = data.leaderboard.map((entry) => entry._id);
      await fetchUserDetails(userIds);
    } catch (error) {
      setError(error.message || "Failed to fetch leaderboard data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupLeaderboard = async () => {
    setLoading(true);
    setError(null);

    const token = getAuthToken();
    try {
      const groupFetch = await axios.get(`${apiEndpoint}/groups/joined`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const group = groupFetch.data;
      if (!group) {
        setLeaderboard(null);
        setDoesGroupExist(false);
        return;
      }

      setDoesGroupExist(true);

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

      const leaderboardData = response.data.leaderboard;
      setLeaderboard(leaderboardData);

      const userIds = leaderboardData.map((entry) => entry._id);
      await fetchUserDetails(userIds);
    } catch (error) {
      setLeaderboard(null);
      setError(error.message || "Failed to fetch group leaderboard data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userIds) => {
    if (!userIds || userIds.length === 0) return;

    try {
      const response = await axios.post(
        `${apiEndpoint}/users/by-ids`,
        { users: userIds },
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

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
    if (newValue === 0) {
      fetchGlobalLeaderboard();
    } else {
      fetchGroupLeaderboard();
    }
  };

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  return (
    <div className="leaderboard-container">
      <Card className="card-root leaderboard-card">
        <CardHeader title="Leaderboard" className="card-header leaderboard-main-header" />

        <Box className="subtabs-container">
          <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth" className="leaderboard-subtabs">
            <Tab label="Global Leaderboard" icon={<PublicIcon />} iconPosition="start" className="leaderboard-subtab" />
            <Tab label="Group Leaderboard" icon={<GroupIcon />} iconPosition="start" className="leaderboard-subtab" />
          </Tabs>
        </Box>

        <CardContent className="card-content">
          {tabIndex === 0 ? (
            <LoadingErrorHandler loading={loading} error={error}>
              <LeaderboardTable
                leaderboard={leaderboard}
                usersLeaderboard={usersLeaderboard}
                player={player}
                getUsernameById={getUsernameById}
              />
            </LoadingErrorHandler>
          ) : (
            <>
              {!doesGroupExist ? (
                <Alert severity="info" className="group-alert">
                  You do not belong to any group! Join a group to see the group leaderboard.
                </Alert>
              ) : (
                <LoadingErrorHandler loading={loading} error={error}>
                  <LeaderboardTable
                    leaderboard={leaderboard}
                    usersLeaderboard={usersLeaderboard}
                    player={player}
                    getUsernameById={getUsernameById}
                  />
                </LoadingErrorHandler>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function LeaderboardTable({ leaderboard, usersLeaderboard, player, getUsernameById }) {
  if (!leaderboard || !usersLeaderboard) return null;

  return (
    <TableContainer component={Paper} className="leaderboard-table-container">
      <Table aria-label="leaderboard table" className="leaderboard-table">
        <TableHead>
          <TableRow>
            <TableCell className="table-header">Rank</TableCell>
            <TableCell className="table-header">Username</TableCell>
            <TableCell align="right" className="table-header">Total Score</TableCell>
            <TableCell align="right" className="table-header">Games Played</TableCell>
            <TableCell align="right" className="table-header">Average Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leaderboard.map((entry) => {
            const isCurrentPlayer =
              player && (player === entry._id || (typeof player === "object" && player._id === entry._id));

            return (
              <TableRow key={entry._id} className={`leaderboard-entry ${isCurrentPlayer ? "current-player" : ""}`}>
                <TableCell className="rank">#{entry.rank}</TableCell>
                <TableCell className="player-name">
                  {isCurrentPlayer ? (
                    <Typography component="span" fontWeight="bold">
                      {getUsernameById(entry._id)} (You)
                    </Typography>
                  ) : (
                    getUsernameById(entry._id)
                  )}
                </TableCell>
                <TableCell align="right" className="score">{`${entry.totalScore.toLocaleString()} points`}</TableCell>
                <TableCell align="right">{entry.totalGames}</TableCell>
                <TableCell align="right">{`${entry.avgScore.toFixed(1)} points`}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

LeaderboardTable.propTypes = {
  leaderboard: PropTypes.array,
  usersLeaderboard: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  player: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  getUsernameById: PropTypes.func.isRequired
};

