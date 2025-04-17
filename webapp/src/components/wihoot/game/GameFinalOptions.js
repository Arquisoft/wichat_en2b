import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

export default function GameFinal({ results, playerName, isGuest, onExit, onRegister }) {
    return (
        <Box className="final-results">
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                Game Over!
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Final Results:
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table aria-label="results table">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                            <TableCell>Rank</TableCell>
                            <TableCell>Player</TableCell>
                            <TableCell align="right">Score</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.map((player, index) => (
                            <TableRow
                                key={player.playerId}
                                sx={{
                                    backgroundColor: player.playerName === playerName ? '#e3f2fd' : 'inherit',
                                    '&:nth-of-type(odd)': {
                                        backgroundColor: player.playerName === playerName ? '#e3f2fd' : '#fafafa',
                                    }
                                }}
                            >
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{player.playerName}</TableCell>
                                <TableCell align="right">{player.points}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onExit}
                    size="large"
                >
                    Exit Game
                </Button>
                { isGuest &&  (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onRegister}
                    size="large"
                >
                    Register
                </Button> )
                }
            </Box>
        </Box>
    );
}