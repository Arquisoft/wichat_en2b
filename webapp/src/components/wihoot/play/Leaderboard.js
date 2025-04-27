import "../../../styles/wihoot/PlayerView.css";
import { List, ListItem, ListItemText, Typography, Badge } from "@mui/material";

export default function Leaderboard({ players, playerId, title }) {
  return (
    <div>
      {title && <Typography variant="h6">{title}</Typography>}
      {players.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No players
        </Typography>
      ) : (
        <List className="results-list">
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <ListItem
                key={player.id}
                className={`result-item ${player.id === playerId ? "current-player" : ""}`}
              >
                <ListItemText
                  primary={`#${index + 1} ${player.username}`}
                  secondary={
                    player.id === playerId && (
                      <Badge
                        badgeContent="You"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: "#6c63ff",
                            color: "white",
                          },
                        }}
                      />
                    )
                  }
                />
                <Typography variant="body1" fontWeight="bold">
                  {player.score}
                </Typography>
              </ListItem>
            ))}
        </List>
      )}
    </div>
  );
}