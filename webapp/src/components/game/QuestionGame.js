import React, { useEffect, useState } from "react";
import "../../styles/QuestionGame.css";
import { Alert, CircularProgress, LinearProgress, Box, Typography } from "@mui/material";
import InGameChat from "@/components/game/InGameChat";
import FinishGame from "@/components/game/FinishGame";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function QuestionGame(params) {
    const { topic, totalQuestions, numberOptions, timerDuration, question, fetchQuestionsURL } = params;
    const [correctAnswer, setCorrectAnswer] = useState(null);
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
            const response = await fetch(`${apiEndpoint}${fetchQuestionsURL}`);
            
            const data = await response.json();
            setQuestions(data);
            resetState();
            setLoading(false);
        } catch (err) {
            console.error("Error fetching questions:", err);
        }
    };

    const finishParams = {answers: answers, callback: fetchQuestions, subject: topic.toLowerCase()};

    const resetState = () => {
        setAnswers([]);
        setCurrentQuestion(0);
        setIsRight(false);
        setIsWrong(false);
        setSelectedOption(null);
        setTimeLeft(timerDuration);
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

    const handleOptionSelect = async (option) => {
        if (isTransitioning.current || selectedOption !== null) return;

        isTransitioning.current = true;
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;

        setSelectedOption(option);

        try {
            const response = await fetch(`${apiEndpoint}/question/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question_id: questions[currentQuestion].question_id,
                    selected_answer: option
                })
            });

            const { isCorrect, correctAnswer } = await response.json();

            setIsRight(isCorrect);
            setIsWrong(!isCorrect);
            setCorrectAnswer(correctAnswer);

            setAnswers((prevAnswers) => [
                ...prevAnswers,
                {
                    answer: option,
                    isCorrect: isCorrect,
                    points: calculatePoints(isCorrect),
                    timeSpent: timerDuration - timeLeft,
                    rightAnswer: correctAnswer,
                },
            ]);

            setTimeout(() => {
                transitionToNextQuestion();
            }, 2000);
        } catch(error) {
            console.error('Error validating answer: ', error);
        }
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
        setCorrectAnswer(null);
    };

    useEffect(() => {
        if (loading || currentQuestion >= totalQuestions || isTransitioning.current || selectedOption !== null) return;

        let lastUpdate = Date.now();

        timerIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const delta = (now - lastUpdate) / 1000; // in seconds
            lastUpdate = now;

            setTimeLeft(prevTime => {
                const newTime = prevTime - delta;

                if (newTime <= 0) {
                    stopTimerAndTransition();
                    return 0;
                }

                return newTime;
            });
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
                <Typography variant="body2" className="timer-text" id='quiz-timer'>
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
                        <Alert id='message-success'severity="success" className="alert-box">
                            Great job! You got it right!
                        </Alert>
                    )}
                    {isWrong && (
                        <Alert id='message-fail' severity="error" className="alert-box">
                            Oops! You didn't guess this one.
                        </Alert>
                    )}

                    <div className="progress-indicator">
                        Question {currentQuestion + 1} of {totalQuestions}
                    </div>
                    <h2 id='title-question' className="question-title">{question}</h2>

                    <div className="image-box">
                        <img
                            src={`${apiEndpoint}${questions[currentQuestion].image_name}`}
                            alt="Question"
                            className="quiz-image"
                        />
                    </div>

                    <div className="options-box">
                        {questions[currentQuestion].answers.map((option, index) => (
                            <button
                                id={`option-${index}`}
                                key={option}
                                className={`quiz-option 
                                ${selectedOption === option ? "selected" : ""} 
                                ${selectedOption === option && isRight ? "correct-answer" : ""}
                                ${!isRight && correctAnswer === option ? "correct-answer" : ""}`}
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
        <FinishGame {...finishParams}/>
    );
}