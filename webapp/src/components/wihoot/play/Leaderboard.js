import "../../../styles/wihoot/PlayerView.css";
import { List, ListItem, ListItemText, Typography } from "@mui/material";
import PropTypes from 'prop-types';

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

Leaderboard.propTypes = {
  players: PropTypes.array.isRequired,
  playerId: PropTypes.string.isRequired,
  title: PropTypes.string
};