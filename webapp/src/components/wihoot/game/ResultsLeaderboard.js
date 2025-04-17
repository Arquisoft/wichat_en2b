import { Box, Typography, Alert, Paper } from "@mui/material";

export default function ResultsLeaderboard({ results, playerName, questionIndex }) {
    // Find current player's result
    const playerResult = results.playerResults.find(
        (p) => p.playerName === playerName
    );

    return (
        <Box className="results">
            <Typography variant="h5" gutterBottom>
                Question {questionIndex} Results
            </Typography>

            <Paper elevation={2} sx={{p: 2, mb: 3, backgroundColor: '#f5f5f5'}}>
                <Typography variant="h6" gutterBottom>
                    Correct Answer: {results.correctAnswer}
                </Typography>
            </Paper>

            <table className="results-table">
                <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Total Score</th>
                </tr>
                </thead>
                <tbody>
                {results.map((result, index) => (
                    <tr key={result.playerId} className={result.correct ? "correct-answer" : ""}>
                        <td>{index + 1}</td>
                        <td>{result.playerName}</td>
                        <td>{result.points}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            {playerResult && (
                <Box className="player-result" sx={{mb: 3}}>
                    <Typography variant="h6" gutterBottom>
                        Your Result:
                    </Typography>

                    <Alert
                        severity={playerResult.points > 0 ? "success" : "info"}
                        sx={{mb: 2}}
                    >
                        <Typography>
                            Points: <strong>{playerResult.points || 0}</strong>
                        </Typography>
                    </Alert>
                </Box>
            )}

            <Typography sx={{fontStyle: 'italic'}}>
                Waiting for the host to continue...
            </Typography>
        </Box>
    );
}