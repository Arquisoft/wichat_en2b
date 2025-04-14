import { Box, Typography, Button } from "@mui/material";

export default function GameLobby({ onExit }) {
    return (
        <Box className="lobby">
            <Typography variant="h5" gutterBottom>
                Waiting for the host to start the game...
            </Typography>

            <Typography sx={{ mb: 3 }}>
                You've successfully joined the game!
            </Typography>

            <Button
                variant="outlined"
                color="secondary"
                onClick={onExit}
            >
                Exit Game
            </Button>
        </Box>
    );
}