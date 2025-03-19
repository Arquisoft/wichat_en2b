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

    const handleOptionSelect = (option) => {
        if (option === questions[currentQuestion].right_answer) {
            setIsRight(true);
        } else {
            setIsWrong(true);
        }

        setTimeout(() => {
            if (currentQuestion < totalQuestions - 1) {
                setCurrentQuestion(currentQuestion + 1);
                setIsRight(false);
                setIsWrong(false);
            } else {
                alert("Quiz completed!");
            }
        }, 2000);
    };

    const fetchQuestions = async () => {
        try {
            const response = await fetch(`${gatewayService}/game/${topic}/${totalQuestions}/${numberOptions}`);
            if (!response.ok) throw new Error("Failed to fetch questions");
            const data = await response.json();
            setQuestions(data);
        } catch (err) {
            console.error('Error fetching questions:', err);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    if (questions.length === 0) {
        return <CircularProgress />;
    }

    return (
        <div className="quiz-wrapper">
            <div className="divider"></div>

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
                        <button key={option} className="quiz-option" onClick={() => handleOptionSelect(option)}>
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="divider"></div>
        </div>
    );
}
