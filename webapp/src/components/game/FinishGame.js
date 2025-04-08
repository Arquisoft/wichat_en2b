import { Alert, Button } from "@mui/material";
import React, { useEffect, useState } from "react";

export default function FinishGame(params) {
    const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';
    const answers = params.answers;
    const fetchQuestions = params.callback;
    const subject = params.subject;

    // State to track guest status and token
    const [token, setToken] = useState(null);
    const [isGuest, setIsGuest] = useState(true);

    // Calculate game results once
    const gameData = {
        subject,
        points_gain: answers.reduce((acc, a) => acc + a.points, 0),
        number_of_questions: answers.length,
        number_correct_answers: answers.filter((a) => a.isCorrect).length,
        total_time: answers.reduce((acc, a) => acc + a.timeSpent, 0),
    };

    // Function to save game data to the server
    const saveGameData = async (authToken) => {
        try {
            const response = await fetch(`${apiEndpoint}/game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(gameData),
            });
            if (!response.ok) {
                throw new Error('Failed to save game data');
            }
            console.log('Game data saved successfully');
            // Clear local storage after successful save
            localStorage.removeItem('guestGameData');
        } catch (error) {
            console.error("Error saving game data:", error);
        }
    };

    // Check token and handle guest logic
    useEffect(() => {
        // Get token from cookies
        const currentToken = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        setToken(currentToken);
        setIsGuest(!currentToken);

        if (currentToken) {
            // If token exists, check for stored guest data and save it
            const storedGameData = localStorage.getItem('guestGameData');
            if (storedGameData) {
                saveGameData(currentToken);
            } else {
                // Save current game data if logged in
                saveGameData(currentToken);
            }
        } else {
            // If guest, store game data locally
            localStorage.setItem('guestGameData', JSON.stringify(gameData));
        }
    }, [answers, subject]); // Dependencies ensure this runs when answers or subject change

    return (
        <div className="quiz-results-container">
            <div className="quiz-header">Quiz Completed!</div>
            <div className="score">
                <span className="score-fraction">
                    {gameData.number_correct_answers}/{gameData.number_of_questions}
                </span>
                <span className="score-percentage">
                    {(gameData.number_correct_answers / gameData.number_of_questions) * 100}% Correct
                </span>
                <span className="score-points">
                    {gameData.points_gain} points
                </span>
            </div>
            <div className="answers-header">Your Answers:</div>
            <div className="answers-list">
                {answers.map((answer, index) => (
                    <div key={index + 1} className="answer-item">
                        <h4 className="answer-number">Question {index + 1}:</h4>
                        {answer.isCorrect ? (
                            <Alert severity="success" className="result-box alert-success">
                                You answered: {answer.answer}
                            </Alert>
                        ) : (
                            <>
                                <Alert severity="error" className="result-box alert-error">
                                    You answered: {answer.answer}
                                </Alert>
                                <Alert severity="success" className="result-box alert-correct">
                                    Right answer: {answer.right_answer}
                                </Alert>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <div className="buttons">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => (location.href = isGuest ? '/guest/home' : '/')}
                    sx={{ marginRight: "1rem" }}
                >
                    Back to home
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={fetchQuestions}
                >
                    Play again
                </Button>
                {isGuest && (
                    <div className="guest-options">
                        <Alert severity="info" sx={{ marginTop: "1rem" }}>
                            Want to save your score? Log in or register now!
                        </Alert>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => (location.href = '/login')}
                            sx={{ marginRight: "1rem" }}
                        >
                            Log In
                        </Button>
                        <Button
                            variant="outlined"
                            color="success"
                            onClick={() => (location.href = '/register')}
                        >
                            Register
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}