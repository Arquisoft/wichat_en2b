"use client";

import React, { useEffect, useState } from "react";
import "../../styles/QuestionGame.css";
import { Alert, CircularProgress, LinearProgress, Box, Typography } from "@mui/material";
import InGameChat from "@/components/game/InGameChat";

const gatewayService = process.env.GATEWAY_SERVICE_URL || "http://localhost:8000"

export default function QuestionGame(params) {
    const topic = params.topic;
    const totalQuestions = params.totalQuestions;
    const numberOptions = params.numberOptions;
    const timerDuration = params.timerDuration; // Time per question in seconds (default to 30 if not passed)
    const question = params.question;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [isWrong, setIsWrong] = useState(false);
    const [isRight, setIsRight] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null); // Track the selected option
    const [timeLeft, setTimeLeft] = useState(timerDuration); // Time left for the current question
    const [answers, setAnswers] = useState([]);

    // Use a ref to track if we're currently transitioning to the next question
    const isTransitioning = React.useRef(false);
    // Use a ref to track the current timer interval
    const timerIntervalRef = React.useRef(null);

    const handleOptionSelect = (option) => {
        // If we're already transitioning to the next question, don't process again
        if (isTransitioning.current) {
            return;
        }

        // Mark that we're transitioning to prevent duplicate calls
        isTransitioning.current = true;

        // Clear any existing timer
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        if (option === questions[currentQuestion].right_answer && option !== "None") {
            setIsRight(true);
        } else if (option !== "None") {
            setIsWrong(true);
        }

        setSelectedOption(option); // Mark the selected option

        setTimeout(() => {
            if (currentQuestion < totalQuestions) {
                setAnswers((prevAnswers) => [
                    ...prevAnswers,
                    {
                        answer: option,
                        right_answer: questions[currentQuestion].right_answer,
                        isCorrect: option === questions[currentQuestion].right_answer,
                        points: option === questions[currentQuestion].right_answer ? Math.ceil(10 * (300/timerDuration) * (timeLeft/timerDuration)) : 0,
                    },
                ]);
                setCurrentQuestion(currentQuestion + 1);
                setIsRight(false);
                setIsWrong(false);
                setSelectedOption(null);
                setTimeLeft(timerDuration);

                // Reset the transitioning flag after the state updates
                setTimeout(() => {
                    isTransitioning.current = false;
                }, 0);
            }
        }, 2000);
    };

    const fetchQuestions = async () => {
        try {
            const response = await fetch(`${gatewayService}/game/${topic}/${totalQuestions}/${numberOptions}`);
            const data = await response.json();
            setQuestions(data);
            setAnswers([])
            setCurrentQuestion(0);
            setIsRight(false);
            setIsWrong(false);
            setSelectedOption(null);
            setTimeLeft(timerDuration);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching questions:", err);
        }
    };

    // Timer logic: countdown for each question
    useEffect(() => {
        // Clean up any existing timer
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        // Don't start a new timer if loading, at the end of questions, transitioning, or already selected
        if (loading || currentQuestion >= totalQuestions || isTransitioning.current || selectedOption !== null) {
            return;
        }

        // Set up a new timer
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 0) {
                    // If time is up and we're not already transitioning
                    if (!isTransitioning.current) {
                        // Clear the interval immediately to prevent multiple calls
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null;

                        // Handle timeout
                        handleOptionSelect("None");
                    }
                    return 0;
                }
                return prevTime - 0.01;
            });
        }, 10);

        // Cleanup function
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [currentQuestion, loading, selectedOption]);

    useEffect(() => {
        fetchQuestions().then(() => {});

        // Cleanup on component unmount
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, []);

    return currentQuestion < totalQuestions ? (
        <div className="quiz-wrapper">
            {/* Timer and progress bar */}
            <Box className="timer-container">
                <Typography variant="body2" className="timer-text">
                    Time left: {Math.ceil(timeLeft)}s
                </Typography>
                <LinearProgress className="progress-bar" variant="determinate" value={(timeLeft / timerDuration) * 100} />
            </Box>
            {loading ? (
                <div className="loading-container">
                    <CircularProgress className="loading-spinner" />
                    <p className="loading-text">Loading your quiz...</p>
                </div>
            ) : (
                <div className="content-box">
                    {isRight && (
                        <Alert severity="success" className="alert-box">
                            Great job! You got it right!
                        </Alert>
                    )}
                    {isWrong && (
                        <Alert severity="error" className="alert-box">
                            Oops! You didn't guess this one.
                        </Alert>
                    )}

                    <div className="progress-indicator">
                        Question {currentQuestion + 1} of {totalQuestions}
                    </div>
                    <h2 className="question-title">{question}</h2>

                    <div className="image-box">
                        <img
                            src={`${gatewayService}${questions[currentQuestion].image_name}`}
                            alt="Question"
                            className="quiz-image"
                        />
                    </div>

                    <div className="options-box">
                        {questions[currentQuestion].answers.map((option) => (
                            <button
                                key={option}
                                className={`quiz-option 
                                ${selectedOption === option ? "selected" : ""} 
                                ${option === questions[currentQuestion].right_answer ? "correct-answer" : ""}`}
                                onClick={() => handleOptionSelect(option)}
                                disabled={selectedOption !== null}>
                                {option}
                            </button>

                        ))}
                    </div>

                    <InGameChat initialMessages={[]} question={questions[currentQuestion]} />
                </div>
            )}
            <div className="divider"></div>
        </div>
    ) : (
        <div className="quiz-results-container">
            <div className="quiz-header">Quiz Completed!</div>
            <div className="score">
                <span className="score-fraction">
                    {answers.filter((a) => a.isCorrect).length}/{totalQuestions}
                </span>
                <span className="score-percentage">
                    {(answers.filter((a) => a.isCorrect).length / totalQuestions) * 100}% Correct
                </span>
                <span className="score-points">
                    {answers.reduce((acc, a) => acc + a.points, 0)} points
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
                <button className="back-button">Back to home</button>
                <button className="play-again-button" onClick={fetchQuestions}>Play again</button>
            </div>
        </div>
    );
}