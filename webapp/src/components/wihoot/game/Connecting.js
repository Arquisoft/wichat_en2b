
import { Box, CircularProgress, Typography } from "@mui/material";
import "@/styles/wihoot/Connecting.css";

export default function GameConnecting() {
    return (
        <Box className="game-connecting">
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
                Connecting to game...
            </Typography>
        </Box>
    );
}