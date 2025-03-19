import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardContent, Typography } from "@mui/material";
import "../../../styles/LeaderboardTab.css"; 

export default function LeaderboardTab({ leaderboardData }) {
  return (
    <Card className="card-root">
      <CardHeader 
        className="card-header" 
        title="Leaderboard" 
      />
      <CardContent className="card-content">
        {leaderboardData.map((player) => (
          <div key={player.rank} className="leaderboard-entry">
            <Typography className="rank">#{player.rank}</Typography>
            <Typography className="player-name">{player.name}</Typography>
            <Typography className="score">{player.score.toLocaleString()}</Typography>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

LeaderboardTab.propTypes = {
  leaderboardData: PropTypes.arrayOf(
    PropTypes.shape({
      rank: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      score: PropTypes.number.isRequired,
    })
  ).isRequired,
};
