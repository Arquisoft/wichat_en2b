import { List, ListItem, ListItemText, Badge } from "@mui/material";
import "../../../styles/wihoot/PlayerView.css";

export default function PlayerList({ players, playerId }) {
  return (
    <List className="players-list">
      {players.map((player) => (
        <ListItem
          key={player.id}
          className={`player-item ${player.id === playerId ? "current-player" : ""}`}
          sx={{
            mb: 1,
            borderRadius: "6px",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            },
          }}
        >
          <ListItemText
            primary={player.username}
            sx={{
              "& .MuiListItemText-primary": {
                fontWeight: 500,
                fontSize: "1rem",
              },
            }}
          />
          {player.id === playerId && <Badge badgeContent="You" color="primary" />}
        </ListItem>
      ))}
    </List>
  );
}