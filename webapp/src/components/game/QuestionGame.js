import React, { useEffect, useState } from 'react';
import "../../styles/QuestionGame.css";
import { Alert, CircularProgress } from "@mui/material";
const gatewayService = process.env.GATEWAY_SERVICE_URL || 'http://localhost:8004';

export default function QuestionGame(params) {
    const topic = params.topic;
    const totalQuestions = params.totalQuestions;
    const numberOptions = params.numberOptions;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [isWrong, setIsWrong] = useState(false);
    const [isRight, setIsRight] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null); // Track the selected option

    const handleOptionSelect = (option) => {
        if (option === questions[currentQuestion].right_answer) {
            setIsRight(true);
        } else {
            setIsWrong(true);
        }

        setSelectedOption(option); // Mark the selected option

        setTimeout(() => {
            if (currentQuestion < totalQuestions - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setIsRight(false);
                setIsWrong(false);
                setSelectedOption(null); // Reset selected option for the next question
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

    useEffect(() => {
        fetchQuestions();
    }, []);

    return (
        <div className="quiz-wrapper">
            <div className="divider"></div>
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
                </div>
            )}
            <div className="divider"></div>
        </div>
    );
}
