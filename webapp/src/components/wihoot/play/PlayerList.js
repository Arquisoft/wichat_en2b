import { List, ListItem, ListItemText, Chip, Box } from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import PropTypes from "prop-types";
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
          <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
            <ListItemText
              primary={player.username}
              sx={{
                "& .MuiListItemText-primary": {
                  fontWeight: 500,
                  fontSize: "1rem",
                },
              }}
            />
            {player.id === playerId && (
              <Chip
                icon={<PersonIcon fontSize="small" />}
                label="You"
                color="primary"
                size="small"
                sx={{
                  fontWeight: 600,
                  borderRadius: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                  '@media (max-width: 600px)': {
                    '& .MuiChip-label': {
                      px: 1,
                    },
                    '& .MuiChip-icon': {
                      fontSize: '0.8rem',
                    },
                  }
                }}
              />
            )}
          </Box>
        </ListItem>
      ))}
    </List>
  );
}

PlayerList.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
    })
  ).isRequired,
  playerId: PropTypes.string,
};