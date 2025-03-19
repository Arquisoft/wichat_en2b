import React, { useEffect, useState } from 'react';
import "../../styles/QuestionGame.css";
import { Alert, CircularProgress, LinearProgress, Box, Typography } from "@mui/material";
import InGameChat from "@/components/game/InGameChat";
const gatewayService = process.env.GATEWAY_SERVICE_URL || 'http://localhost:8004';

export default function QuestionGame(params) {
    const topic = params.topic;
    const totalQuestions = params.totalQuestions;
    const numberOptions = params.numberOptions;
    const timerDuration = params.timerDuration; // Time per question in seconds (default to 30 if not passed)

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [isWrong, setIsWrong] = useState(false);
    const [isRight, setIsRight] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null); // Track the selected option
    const [timeLeft, setTimeLeft] = useState(timerDuration); // Time left for the current question

    const handleOptionSelect = (option) => {
        if (option === questions[currentQuestion].right_answer && option !== null) {
            setIsRight(true);
        } else if (option !== null) {
            setIsWrong(true);
        }

        if (option === null)
            setSelectedOption('This is an option that will never be selected.')
        else
            setSelectedOption(option); // Mark the selected option

        setTimeout(() => {
            if (currentQuestion < totalQuestions - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setIsRight(false);
                setIsWrong(false);
                setSelectedOption(null);
                setTimeLeft(timerDuration);
            } else {
                alert("Quiz completed!");
            }
        }, 2000);
    };

    const fetchQuestions = async () => {
        try {
            const response = await fetch(`${gatewayService}/game/${topic}/${totalQuestions}/${numberOptions}`);
            const data = await response.json();
            setQuestions(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching questions:', err);
        }
    };

    // Timer logic: countdown for each question
    useEffect(() => {
        if (loading || currentQuestion >= totalQuestions) return;

        const timerInterval = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime > 0.00 && prevTime <= 0.01 && selectedOption !== 'This is an option that will never be selected.') {
                    clearInterval(timerInterval);
                    handleOptionSelect(null); // Automatically move to next question
                }
                return prevTime - 0.01;
            });
        }, 10);

        return () => clearInterval(timerInterval);
    }, [currentQuestion, loading]);

    useEffect(() => {
        fetchQuestions();
    }, []);

    return (
        <div className="quiz-wrapper">{/* Timer and progress bar */}
            <Box className="timer-container">
                <Typography variant="body2" className="timer-text">
                    Time left: {Math.ceil(timeLeft)}s
                </Typography>
                <LinearProgress
                    className="progress-bar"
                    variant="determinate"
                    value={timeLeft/timerDuration * 100}
                />
            </Box>
            {loading ? (
                <div className="loading-container">
                    <CircularProgress className="loading-spinner" />
                    <p className="loading-text">Loading your quiz...</p>
                </div>
            ) : (
                <div className="content-box">
                    {isRight && <Alert severity="success" className="alert-box">Great job! You got it right!</Alert>}
                    {isWrong && <Alert severity="error" className="alert-box">Oops! Try again.</Alert>}

                    <div className="progress-indicator">Question {currentQuestion + 1} of {totalQuestions}</div>
                    <h2 className="question-title">{questions[currentQuestion].question}</h2>

                    <div className="image-box">
                        <img src={`${gatewayService}${questions[currentQuestion].image_name}`} alt="Question" className="quiz-image" />
                    </div>

                    <div className="options-box">
                        {questions[currentQuestion].answers.map((option) => (
                            <button
                                key={option}
                                className={`quiz-option ${selectedOption === option ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect(option)}
                                disabled={selectedOption !== null} // Disable all options after one is selected
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    <InGameChat initialMessages={[]} question={questions[currentQuestion]} />
                </div>
            )}
            <div className="divider"></div>
        </div>
    );
}