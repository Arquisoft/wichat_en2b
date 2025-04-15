
import { Box, CircularProgress, Typography } from "@mui/material";

export default function GameConnecting() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px'
            }}
        >
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
                Connecting to game...
            </Typography>
        </Box>
    );
}