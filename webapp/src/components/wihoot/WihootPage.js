"use client"; //socker.io-client requires this page to be computed in client side

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import io from "socket.io-client";
import { Alert, Box, Typography } from "@mui/material";

import '../../styles/wihoot/play.css';

import Connecting from "@/components/wihoot/game/Connecting";
import Lobby from "@/components/wihoot/game/Looby";
import Question from "@/components/wihoot/game/Question";
import Waiting from "@/components/wihoot/game/Waiting";
import ResultsLeaderboard from "@/components/wihoot/game/ResultsLeaderboard";
import GameFinalOptions from "@/components/wihoot/game/GameFinalOptions";

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function PlayPage( code, name) {
    const router = useRouter();

    const searchParams = useSearchParams();
    const playerId = searchParams.get('playerId');

    const [socket, setSocket] = useState(null)

    const [gameState, setGameState] = useState("connecting");
    const [gameCode, setGameCode] = useState(code || "");
    const [playerName, setPlayerName] = useState(name || "");
    const [isGuest, setIsGuest] = useState(false);

    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timer, setTimer] = useState(0);
    const [questionResults, setQuestionResults] = useState(null);
    const [finalResults, setFinalResults] = useState(null);
    const [playerScore, setPlayerScore] = useState(0);

    const [errorMessage, setErrorMessage] = useState(null);

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

        const config = token ? {
            path: '/socket.io',
            transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        } : {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        }

        const newSocket = io(gatewayUrl, config);

        newSocket.on('connect', () => {
            console.log('Connected to Socket.IO server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            setErrorMessage('Failed to connect to the game server. Please try again.');
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
        if (!socket || !gameCode || !playerName) return;

        setGameState("joining");

        socket.emit("join-session", { code: gameCode, playerId, username: playerName, isGuest }, (response) => {
            if (response) {
                setGameState("lobby");
                // Fetch initial session status
                fetchSessionStatus();
            } else {
                setErrorMessage(response.message || "Failed to join game");
                setGameState("error");
            }
        });

        // Periodically fetch session status
        const statusInterval = setInterval(fetchSessionStatus, 5000); // Every 5 seconds

        async function fetchSessionStatus() {
            try {
                const response = await fetch(`${gatewayUrl}/shared-quiz/${gameCode}/status`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch status: ${response.status}`);
                }
                const data = await response.json();
                // Update game state based on status
                if (data.status === "active" && gameState === "lobby") {
                    setGameState("waiting");
                } else if (data.status === "finished") {
                    setGameState("final");
                    setFinalResults({ players: data.players });
                }
            } catch (error) {
                console.error("Failed to fetch session status:", error);
                setErrorMessage("Unable to fetch game status. Please check your connection.");
            }
        }

        return () => {
            clearInterval(statusInterval);
            socket.off("join-session");
        };
    }, [socket, gameCode, playerName, playerId, isGuest, gameState, token]);

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

        socket.on("question-ended", (questionIndex, results) => {
            console.log("Question ",questionIndex," ended:", results);
            setQuestionResults({ index: questionIndex, results: results });
            setGameState("results");

            const playerResult = results.find(
                (p) => p.playerName === playerName
            );

            if (playerResult) {
                setPlayerScore(playerResult.points || 0);
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

    // Handle registration of guest users
    const handleRegister = () => {
        //TODO implement
    };

    // Render appropriate component based on game state
    switch (gameState) {
        case "connecting":
        case "joining":
            return <Connecting />;

        case "error":
            return (
                <Box className="play-container">
                    <Alert severity="error">{String(errorMessage) || "An error occurred"}</Alert>
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
                        <Lobby onExit={handleExitGame} />
                    )}

                    {gameState === "question" && currentQuestion !== null && (
                        <Question
                            question={currentQuestion}
                            timer={timer}
                            onAnswerSubmit={handleAnswerSubmit}
                        />
                    )}

                    {gameState === "waiting" && (
                        <Waiting />
                    )}

                    {gameState === "results" && questionResults !== null && (
                        <ResultsLeaderboard results={questionResults.results} playerName={playerName} questionIndex={questionResults.index} />
                    )}

                    {gameState === "final" && finalResults !== null && (
                        <GameFinalOptions results={finalResults} playerName={playerName} isGuest={isGuest} onExit={handleExitGame} onRegister={handleRegister} />
                    )}
                </Box>
            );
    }
}