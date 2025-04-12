"use client"; //socker.io-client requires this page to be computed in client side

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import io from "socket.io-client";
import { Alert, Box, Typography } from "@mui/material";

import GameConnecting from "./Connecting";
import GameLobby from "./Looby";
import GameQuestion from "./Question";
import GameWaiting from "./Waiting";
import GameResults from "./ResultsLeaderboard";
import GameFinal from "./GameFinalOptions";

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function PlayPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const codeParam = searchParams.get("code");
    const nameParam = searchParams.get("name");

    const [socket, setSocket] = useState(null);
    const [gameState, setGameState] = useState("connecting");
    const [gameCode, setGameCode] = useState(codeParam || "");
    const [playerName, setPlayerName] = useState(nameParam || "");
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timer, setTimer] = useState(0);
    const [questionResults, setQuestionResults] = useState(null);
    const [finalResults, setFinalResults] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [playerScore, setPlayerScore] = useState(0);

    // Initialize socket connection
    useEffect(() => {
        if (!gameCode || !playerName) {
            router.push("/");
            return;
        }

        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        const newSocket = io(gatewayUrl, {
            path: '/socket.io',   // Use the proxy path
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [gameCode, playerName, router]);

    // Join game when socket is ready
    useEffect(() => {
        if (socket && gameCode && playerName) {
            setGameState("joining");

            socket.emit("join-game", gameCode, playerName, (response) => {
                if (response.success) {
                    setGameState("lobby");
                } else {
                    setErrorMessage(response.message || "Failed to join game");
                    setGameState("error");
                }
            });
        }
    }, [socket, gameCode, playerName]);

    // Socket event handlers added to the ones in the server
    useEffect(() => {
        if (!socket) return;

        socket.on("game-started", () => {
            console.log("Game started");
            setGameState("lobby");
        });

        socket.on("question-started", (question) => {
            console.log("Question started:", question);
            setCurrentQuestion(question);
            setSelectedAnswer(null);
            setGameState("question");
        });

        socket.on("answer-submitted", (data) => {
            console.log("Answer submitted:", data);
        });

        socket.on("question-ended", (results) => {
            console.log("Question ended:", results);
            setQuestionResults(results);
            setGameState("results");

            const playerResult = results.playerResults.find(
                (p) => p.playerName === playerName
            );

            if (playerResult) {
                setPlayerScore(playerResult.totalScore || 0);
            }
        });

        socket.on("game-ended", (results) => {
            console.log("Game ended:", results);
            setFinalResults(results);
            setGameState("final");
        });

        socket.on("timer-update", (time) => {
            setTimer(time);
        });

        socket.on("error", (error) => {
            console.error("Socket error:", error);
            setErrorMessage(error);
        });

        socket.on("disconnect", () => {
            setErrorMessage("Disconnected from the game. Please refresh to reconnect.");
        });

        return () => {
            socket.off("game-started");
            socket.off("question-started");
            socket.off("answer-submitted");
            socket.off("question-ended");
            socket.off("game-ended");
            socket.off("timer-update");
            socket.off("error");
            socket.off("disconnect");
        };
    }, [socket, playerName]);

    // Handle answer submission
    const handleAnswerSubmit = (answerIndex) => {
        if (gameState === "question" && selectedAnswer === null) {
            setSelectedAnswer(answerIndex);
            setGameState("waiting");

            socket.emit("submit-answer", gameCode, answerIndex, (response) => {
                if (!response.success) {
                    setErrorMessage(response.message || "Failed to submit answer");
                    setSelectedAnswer(null);
                    setGameState("question");
                }
            });
        }
    };

    // Exit game
    const handleExitGame = () => {
        router.push("/");
    };

    // Render appropriate component based on game state
    switch (gameState) {
        case "connecting":
        case "joining":
            return <GameConnecting />;

        case "error":
            return (
                <Box className="play-container">
                    <Alert severity="error">{errorMessage || "An error occurred"}</Alert>
                    <button onClick={handleExitGame}>Exit Game</button>
                </Box>
            );

        default:
            return (
                <Box className="play-container">
                    <Box className="header">
                        <Typography variant="h4">Game Code: {gameCode}</Typography>
                        <Box className="player-info">
                            <Typography>
                                Playing as: <strong>{playerName}</strong>
                            </Typography>
                            <Typography>
                                Score: <strong>{playerScore}</strong>
                            </Typography>
                        </Box>
                    </Box>

                    {gameState === "lobby" && (
                        <GameLobby onExit={handleExitGame} />
                    )}

                    {gameState === "question" && currentQuestion && (
                        <GameQuestion
                            question={currentQuestion}
                            timer={timer}
                            onAnswerSubmit={handleAnswerSubmit}
                        />
                    )}

                    {gameState === "waiting" && (
                        <GameWaiting />
                    )}

                    {gameState === "results" && questionResults && (
                        <GameResults results={questionResults} playerName={playerName} />
                    )}

                    {gameState === "final" && finalResults && (
                        <GameFinal results={finalResults} playerName={playerName} onExit={handleExitGame} />
                    )}
                </Box>
            );
    }
}