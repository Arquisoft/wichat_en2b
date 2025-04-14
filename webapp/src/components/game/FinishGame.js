import {Alert} from "@mui/material";
import React, {useEffect} from "react";

export default function FinishGame(params) {
    const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

    const answers = params.answers;
    const fetchQuestions = params.callback;

    useEffect(() => {
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];
        fetch(`${apiEndpoint}/game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                subject: params.subject,
                points_gain: answers.reduce((acc, a) => acc + a.points, 0),
                number_of_questions: answers.length,
                number_correct_answers: answers.filter((a) => a.isCorrect).length,
                total_time: answers.reduce((acc, a) => acc + a.timeSpent, 0)
            })
        })
    })

    return <div className="quiz-results-container">
                <div className="quiz-header">Quiz Completed!</div>
                <div className="score">
                        <span className="score-fraction">
                            {answers.filter((a) => a.isCorrect).length}/{answers.length}
                        </span>
                    <span className="score-percentage">
                            {(answers.filter((a) => a.isCorrect).length / answers.length) * 100}% Correct
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
                                        Right answer: {answer.rightAnswer}
                                    </Alert>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <div className="buttons">
                    <button className="back-home-button" onClick={() => location.href = '/'}>Back to home</button>
                    <button className="play-again-button" onClick={fetchQuestions}>Play again</button>
                </div>
            </div>
}