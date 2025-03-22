import React, { useEffect, useState } from "react";
import "../../styles/QuestionGame.css";
import { Alert, CircularProgress, LinearProgress, Box, Typography } from "@mui/material";
import InGameChat from "@/components/game/InGameChat";

const gatewayService = process.env.GATEWAY_SERVICE_URL || "http://localhost:8000";

export default function QuestionGame(params) {
    const { topic, totalQuestions, numberOptions, timerDuration, question } = params;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [isWrong, setIsWrong] = useState(false);
    const [isRight, setIsRight] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [answers, setAnswers] = useState([]);

    const isTransitioning = React.useRef(false);
    const timerIntervalRef = React.useRef(null);

    const fetchQuestions = async () => {
        try {
            const response = await fetch(`${gatewayService}/game/${topic}/${totalQuestions}/${numberOptions}`);
            const data = await response.json();
            setQuestions(data);
            resetState();
            setLoading(false);
        } catch (err) {
            console.error("Error fetching questions:", err);
        }
    };

    const resetState = () => {
        setAnswers([]);
        setCurrentQuestion(0);
        setIsRight(false);
        setIsWrong(false);
        setSelectedOption(null);
        setTimeLeft(timerDuration);
    };

    const handleTimerUpdate = (prevTime) => {
        if (prevTime <= 0) {
            stopTimerAndTransition();
            return 0;
        }
        return prevTime - 0.01;
    };

    const stopTimerAndTransition = () => {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;

        // Transition to the next question if not already transitioning
        setTimeout(() => {
            if (!isTransitioning.current) {
                handleOptionSelect("None");
            }
        }, 0);
    };

    const handleOptionSelect = (option) => {
        if (isTransitioning.current || selectedOption !== null) return;

        isTransitioning.current = true;
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;

        const isCorrect = option === questions[currentQuestion].right_answer;
        setIsRight(isCorrect);
        setIsWrong(!isCorrect);

        setSelectedOption(option);

        setAnswers((prevAnswers) => [
            ...prevAnswers,
            {
                answer: option,
                right_answer: questions[currentQuestion].right_answer,
                isCorrect,
                points: calculatePoints(isCorrect),
            },
        ]);

        setTimeout(() => {
            transitionToNextQuestion();
        }, 2000);
    };

    const calculatePoints = (isCorrect) => {
        if (isCorrect) {
            return Math.ceil(10 * (80 * numberOptions / timerDuration) * (timeLeft / timerDuration));
        }
        return 0;
    };

    const transitionToNextQuestion = () => {
        if (currentQuestion < totalQuestions) {
            setCurrentQuestion(currentQuestion + 1);
            resetQuestionState();
            isTransitioning.current = false;
        }
    };

    const resetQuestionState = () => {
        setIsRight(false);
        setIsWrong(false);
        setSelectedOption(null);
        setTimeLeft(timerDuration);
    };

    useEffect(() => {
        if (loading || currentQuestion >= totalQuestions || isTransitioning.current || selectedOption !== null) return;

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(handleTimerUpdate);
        }, 10);

        return () => {
            clearInterval(timerIntervalRef.current);
        };
    }, [currentQuestion, loading, selectedOption]);

    useEffect(() => {
        fetchQuestions();

        return () => {
            clearInterval(timerIntervalRef.current);
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
                                ${selectedOption !== null && option === questions[currentQuestion].right_answer ? "correct-answer" : ""}`}
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