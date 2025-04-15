import { Box, Typography, LinearProgress, Button } from "@mui/material";

import InGameChat from "@/components/game/InGameChat";

export default function GameQuestion({ question, timer, onAnswerSubmit }) {
    // Define color classes for answer options
    const colorClasses = ["red", "blue", "green", "yellow"];

    return (
        <Box className="question">
            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Time left: {timer}s
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={(question.answers.length / timer) * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                />
            </Box>

            <Typography variant="h5" sx={{ mb: 3 }}>
                {question.text}
            </Typography>

            <Box className="answer-options" sx={{ display: 'grid', gap: 2, mb: 3 }}>
                {question.answers.map((answer, index) => (
                    <Button
                        key={index}
                        className={`answer-option ${colorClasses[index % colorClasses.length]}`}
                        onClick={() => onAnswerSubmit(index)}
                        variant="contained"
                        fullWidth
                        sx={{
                            height: '60px',
                            textTransform: 'none',
                            fontSize: '1rem',
                            backgroundColor: index === 0 ? '#f44336' :
                                index === 1 ? '#2196f3' :
                                    index === 2 ? '#4caf50' :
                                        '#ffeb3b',
                            color: index === 3 ? '#000' : '#fff'
                        }}
                    >
                        {answer}
                    </Button>
                ))}
            </Box>

            <InGameChat initialMessages={[]} question={question} />
        </Box>
    );
}