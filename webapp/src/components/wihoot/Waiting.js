import { Box, Typography, CircularProgress } from "@mui/material";

export default function GameWaiting() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                textAlign: 'center',
                p: 3
            }}
        >
            <Typography variant="h5" gutterBottom>
                Answer submitted!
            </Typography>

            <Typography sx={{ mb: 3 }}>
                Waiting for other players and the timer to finish...
            </Typography>

            <CircularProgress size={30} />
        </Box>
    );
}