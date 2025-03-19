import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardContent, Typography } from "@mui/material";

export default function LeaderboardTab({ leaderboardData }) {
  return (
    <Card>
      <CardHeader title="Leaderboard" />
      <CardContent>
        {leaderboardData.map((player) => (
          <Typography key={player.rank}>
            #{player.rank} {player.name} - {player.score.toLocaleString()}
          </Typography>
        ))}
      </CardContent>
    </Card>
  );
};

LeaderboardTab.propTypes = {
  leaderboardData: PropTypes.arrayOf(
    PropTypes.shape({
      rank: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      score: PropTypes.number.isRequired,
    })
  ).isRequired,
};

