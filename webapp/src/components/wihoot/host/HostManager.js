"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { fetchWithAuth } from "../../../utils/api-fetch-auth";
import io from "socket.io-client";
import axios from "axios";
import {
    Box,
    Container,
    Typography,
    Card,
    CardHeader,
    CardContent,
    Button,
    Alert,
    List,
    ListItem,
    ListItemText,
    Badge,
    CircularProgress,
} from "@mui/material";
import "../../../styles/wihoot/HostManager.css"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

export default function HostManager() {
    const router = useRouter();
    const { code } = router.query;

    const [socket, setSocket] = useState(null);
    const [hostId, setHostId] = useState("");
    const [sessionStatus, setSessionStatus] = useState("waiting");
    const [players, setPlayers] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [quiz, setQuiz] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);


      useEffect(() => {

        if (!router.isReady || !code) {
            return;
        }

        const fetchUserData = async () => {
            try {
                const token = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("token="))
                    ?.split("=")[1];

                const response = await axios.get(`${apiEndpoint}/token/username`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data) {
                    const userData = response.data;
                    setHostId(userData._id);
                    return userData._id;
                } else {
                    throw new Error("Failed to get user data");
                }
            } catch (err) {
                setError("Authentication error. Please log in again.");
                console.error("Error in fetchUserData:", err);
                return null;
            }
        };

        const fetchSessionData = async () => {
            try {
                const response = await fetchWithAuth(`/shared-quiz/${code}/status`);
                if (response) {
                    const sessionData = response;
                    setSessionStatus(sessionData.status);
                    setPlayers(sessionData.players);
                    setCurrentQuestionIndex(sessionData.currentQuestionIndex);
                    console.log("Session data fetched:", sessionData);
                    return sessionData;
                } else {
                    throw new Error("Failed to fetch session data");
                }
            } catch (err) {
                setError("Failed to load session data");
                console.error("Error in fetchSessionData:", err);
                return null;
            }
        };

        const fetchQuizData = async (sessionData) => {
            if (!sessionData) {
                return;
            }

            try {
                const response = await fetchWithAuth(`/internal/quizdata/${code}`);
                if (response) {
                    const quizData = response;
                    setQuiz(quizData);
                    console.log("Quiz data fetched:", quizData);
                } else {
                    throw new Error("Failed to fetch quiz data");
                }
            } catch (err) {
                setError("Failed to load quiz data");
                console.error("Error in fetchQuizData:", err);
            }
        };

        const initializeSocket = (hostId) => {
            if (!hostId) {
                console.log("No hostId, skipping initialize Socket");
                return;
            }

            const newSocket = io(process.env.SOCKET_SERVER || "http://localhost:8006");

            newSocket.on("connect", () => {
                console.log("Socket connected");
                newSocket.emit("host-session", { code, hostId });
            });

            newSocket.on("hosting-session", (data) => {
                setSessionStatus(data.status);
                setPlayers(data.players);
                setCurrentQuestionIndex(data.currentQuestionIndex);
                console.log("Hosting session data:", data);
            });

            newSocket.on("player-joined", (data) => {
                console.log("Player joined:", data);
                fetchSessionData()
            });

            newSocket.on("player-left", (data) => {
                fetchSessionData()
                console.log("Player left:", data);
            });

            newSocket.on("answer-submitted", (data) => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((player) => (player.id === data.playerId ? { ...player, score: data.score } : player))
                );
                console.log("Answer submitted:", data);
            });

            newSocket.on("error", (data) => {
                setError(data.message);
                console.log("Socket error:", data);
            });

            setSocket(newSocket);
            console.log("Socket initialized:", newSocket);
            return newSocket;
        };

        const setup = async () => {
            setIsLoading(true);
            try {
                const userId = await fetchUserData();
                if (userId) {
                    const sessionData = await fetchSessionData();
                    await fetchQuizData(sessionData);
                    const newSocket = initializeSocket(userId);
                    return () => {
                        if (newSocket) newSocket.disconnect();
                        console.log("Socket disconnected");
                    };
                } else {
                    setError("Failed to fetch host data");
                    console.log("No userId, setup aborted");
                }
            } catch (err) {
                console.error("Error in setup:", err);
                setError("An unexpected error occurred during setup");
            } finally {
                setIsLoading(false);
                console.log("Setup completed, isLoading:", false);
            }
        };

        const cleanup = setup();
        return () => {
            if (cleanup && typeof cleanup === "function") {
                cleanup();
                console.log("Cleanup executed");
            }
        };
    }, [code, router.isReady]);

    // Manejo de router.isReady y code no disponible
    if (!router.isReady) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-xl">Loading quiz data...</p>
                </div>
            </div>
        );
    }

    if (!code) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: No valid quiz code provided.
                </div>
                <button
                    onClick={() => router.push("/wihoot/create")}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Create New Quiz
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-xl">Loading...</p>
                </div>
            </div>
        );
    }

    const handleStartQuiz = async () => {
        if (players.length === 0) {
            setError("Cannot start quiz with no players");
            return;
        }

        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/start?hostId=${hostId}`);
            if (!response) {
                throw new Error("Failed to start quiz");
            }

            const data = response;
            setSessionStatus(data.status);
            setCurrentQuestionIndex(data.currentQuestionIndex);
        } catch (err) {
            setError(err.message || "Failed to start quiz");
            console.error("Error in handleStartQuiz:", err);
        }
    };

    const handleNextQuestion = async () => {
        try {
            const currentQuestion = getCurrentQuestion();
            if (!currentQuestion) {
                throw new Error("No current question available");
            }

            // Enviar la pregunta actual al endpoint para los jugadores
            const response = await fetchWithAuth(`/shared-quiz/${code}/next?hostId=${hostId}`);

            if (!response) {
                throw new Error("Failed to move to next question");
            }

            const data = response;
            setCurrentQuestionIndex(data.currentQuestionIndex);

            // Verificar si hemos llegado al final del quiz
            if (quiz && data.currentQuestionIndex >= quiz.quizData.length) {
                await handleEndQuiz();
            }
        } catch (err) {
            setError(err.message || "Failed to move to next question");
            console.error("Error in handleNextQuestion:", err);
        }
    };

    const handleEndQuiz = async () => {
        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/end?hostId=${hostId}`);

            if (!response) {
                throw new Error("Failed to end quiz");
            }

            const data = response;
            setSessionStatus(data.status);
            setPlayers(data.players);
        } catch (err) {
            setError(err.message || "Failed to end quiz");
            console.error("Error in handleEndQuiz:", err);
        }
    };

    const getCurrentQuestion = () => {
        if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.quizData.length) {
            return null;
        }
        return quiz.quizData[currentQuestionIndex];
    };

    const renderWaitingRoom = () => (
        <Card className="host-manager-card">
            <CardHeader title="Waiting for Players" />
            <CardContent>
                <Box className="code-display" mb={3}>
                    <Typography variant="h6">Share this code with players:</Typography>
                    <Typography variant="h4" className="code-text">
                        {code}
                    </Typography>
                </Box>
                <Box mb={3}>
                    <Typography variant="h6">Players ({players.length})</Typography>
                    {players.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                            No players have joined yet
                        </Typography>
                    ) : (
                        <List className="players-list">
                            {players.map((player) => (
                                <ListItem key={player.id} className="player-item">
                                    <ListItemText primary={player.username} />
                                    {player.isGuest && <Badge badgeContent="Guest" color="secondary" />}
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleStartQuiz}
                    disabled={players.length === 0}
                    className="action-button"
                >
                    Start Quiz
                </Button>
            </CardContent>
        </Card>
    );

    const renderActiveQuiz = () => {
        const currentQuestion = getCurrentQuestion();

        if (!currentQuestion) {
            return (
                <Card className="host-manager-card">
                    <CardContent>
                        <Typography variant="h6" color="error">
                            No question available
                        </Typography>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card className="host-manager-card">
                <CardHeader
                    title={`Question ${currentQuestionIndex + 1} of ${quiz?.quizData.length}`}
                />
                <CardContent>
                    <Typography variant="h6" mb={2}>
                        {quiz.quizMetaData.quizName}
                    </Typography>
                    <List className="options-list">
                        {currentQuestion.answers.map((option, index) => (
                            <ListItem key={index} className="option-item">
                                <ListItemText primary={option} />
                            </ListItem>
                        ))}
                    </List>
                    <Box mt={3} mb={3}>
                        <Typography variant="h6">Leaderboard</Typography>
                        {players.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">
                                No players
                            </Typography>
                        ) : (
                            <List className="leaderboard-list">
                                {[...players]
                                    .sort((a, b) => b.score - a.score)
                                    .map((player, index) => (
                                        <ListItem key={player.id} className="leaderboard-item">
                                            <ListItemText
                                                primary={`#${index + 1} ${player.username}`}
                                                secondary={
                                                    player.isGuest && (
                                                        <Badge badgeContent="Guest" color="secondary" />
                                                    )
                                                }
                                            />
                                            <Typography variant="body1" fontWeight="bold">
                                                {player.score}
                                            </Typography>
                                        </ListItem>
                                    ))}
                            </List>
                        )}
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleNextQuestion}
                        className="action-button"
                    >
                        {currentQuestionIndex + 1 < quiz?.quizData.length ? "Next Question" : "End Quiz"}
                    </Button>
                </CardContent>
            </Card>
        );
    };

    const renderFinishedQuiz = () => (
        <Card className="host-manager-card">
            <CardHeader title="Quiz Completed" />
            <CardContent>
                <Box mb={3}>
                    <Typography variant="h6">Final Results</Typography>
                    {players.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                            No players participated
                        </Typography>
                    ) : (
                        <List className="results-list">
                            {[...players]
                                .sort((a, b) => b.score - a.score)
                                .map((player, index) => (
                                    <ListItem key={player.id} className="result-item">
                                        <ListItemText
                                            primary={`#${index + 1} ${player.username}`}
                                            secondary={
                                                player.isGuest && (
                                                    <Badge badgeContent="Guest" color="secondary" />
                                                )
                                            }
                                        />
                                        <Typography variant="body1" fontWeight="bold">
                                            {player.score}
                                        </Typography>
                                    </ListItem>
                                ))}
                        </List>
                    )}
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push("/shared-quiz/create")}
                    className="action-button"
                >
                    Create New Quiz
                </Button>
            </CardContent>
        </Card>
    );

    if (!router.isReady) {
        return (
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Box textAlign="center">
                    <CircularProgress />
                    <Typography variant="h6" mt={2}>
                        Loading quiz data...
                    </Typography>
                </Box>
            </Container>
        );
    }

    if (!code) {
        return (
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    Error: No valid quiz code provided.
                </Alert>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push("/wihoot/create")}
                >
                    Create New Quiz
                </Button>
            </Container>
        );
    }

    if (isLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Box textAlign="center">
                    <CircularProgress />
                    <Typography variant="h6" mt={2}>
                        Loading...
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Typography variant="h4" gutterBottom>
                Quiz Host - {code}
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {sessionStatus === "waiting" && renderWaitingRoom()}
            {sessionStatus === "active" && renderActiveQuiz()}
            {sessionStatus === "finished" && renderFinishedQuiz()}
        </Container>
    );
}