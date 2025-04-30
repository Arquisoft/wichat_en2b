import { Alert } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

export default function FinishGame({ answers, score, subject }) {
    const router = useRouter();
    const [isGuest, setIsGuest] = useState(true);

    // Calculate metrics once
    const correctAnswersCount = answers.filter((a) => a.isCorrect).length;
    const totalQuestions = answers.length;
    const correctPercentage = (correctAnswersCount / totalQuestions) * 100;
    const totalPoints = answers.reduce((acc, a) => acc + a.points, 0);
    const totalTime = answers.reduce((acc, a) => acc + a.timeSpent, 0);

    // Handle game data saving
    useEffect(() => {
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        const gameData = {
            subject,
            points_gain: totalPoints,
            number_of_questions: totalQuestions,
            number_correct_answers: correctAnswersCount,
            total_time: totalTime,
        };

        const guest = !token;
        setIsGuest(guest);
        localStorage.removeItem("guestGameData");

        if (!guest) {
            fetch(`${apiEndpoint}/game`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(gameData),
            }).then(() => console.log("Game data saved successfully"));
        } else {
            localStorage.setItem("guestGameData", JSON.stringify(gameData));
            console.log("Game data saved locally for guest");
        }
    }, [subject, correctAnswersCount, totalQuestions, totalPoints, totalTime]);


    const NavigationButton = ({ text, onClick, className }) => (
        <button className={className} onClick={onClick}>
            {text}
        </button>
    );

    const AnswerAlert = ({ isCorrect, answerText, rightAnswer }) => (
        <>
            <Alert
                severity={isCorrect ? "success" : "error"}
                className={`result-box ${isCorrect ? "alert-success" : "alert-error"}`}
            >
                You answered: {answerText}
            </Alert>
            {!isCorrect && (
                <Alert severity="success" className="result-box alert-correct">
                    Right answer: {rightAnswer}
                </Alert>
            )}
        </>
    );

    return (
        <div className="quiz-results-container">
            <div className="quiz-header">Your results</div>
            <div className="score">
                <span className="score-fraction">
                    {correctAnswersCount}/{totalQuestions}
                </span>
                <span className="score-percentage">{correctPercentage}% Correct</span>
                <span className="score-points">{score} points</span>
            </div>
            <div className="answers-header">Your Answers:</div>
            <div className="answers-list">
                {answers.map((answer, index) => (
                    <div key={index + 1} className="answer-item">
                        <h4 className="answer-number">Question {index + 1}:</h4>
                        <AnswerAlert
                            isCorrect={answer.isCorrect}
                            answerText={answer.answer}
                            rightAnswer={answer.rightAnswer}
                        />
                    </div>
                ))}
            </div>
            <div className="buttons">
                <NavigationButton
                    text="Back to home"
                    onClick={() => (location.href = isGuest ? "/guest/home" : "/")}
                    className="back-home-button"
                />
            </div>
            {isGuest && (
                <div className="buttons">
                    <Alert severity="info" sx={{ width: "100%" }}>
                        Want to save your score? Log in or register now!
                    </Alert>
                    <NavigationButton
                        text="Log In"
                        onClick={() => router.push("/login")}
                        className="back-home-button"
                    />
                    <NavigationButton
                        text="Register"
                        onClick={() => router.push("/addUser")}
                        className="play-again-button"
                    />
                </div>
            )}
        </div>
    );
}