"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { fetchWithAuth } from "../../../utils/api-fetch-auth";
import io from "socket.io-client";
import axios from "axios";
import "../../../styles/wihoot/PlayerView.css";
import "../../../styles/wihoot/HostManager.css";

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
    CircularProgress,
    LinearProgress,
} from "@mui/material";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

// Custom error class for authentication failures
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = "AuthenticationError";
    }
}

// Custom error class for missing user data
class MissingUserDataError extends Error {
    constructor(message) {
        super(message);
        this.name = "MissingUserDataError";
    }
}

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
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [validatedAnswers, setValidatedAnswers] = useState(null);
    
    // Timer hooks and ref
    const [timeLeft, setTimeLeft] = useState(null);
    const timerIntervalRef = useRef(null);

    // State to manage the visibility of the correct answer
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

    // Helper functions for timer persistence
    const getStoredTimerData = () => {
        const data = localStorage.getItem(`quizTimer_${code}_${hostId}`);
        return data ? JSON.parse(data) : null;
    };

    const storeTimerData = (questionIndex, startTime) => {
        localStorage.setItem(
            `quizTimer_${code}_${hostId}`,
            JSON.stringify({
                questionIndex,
                startTime,
            })
        );
    };

    const clearTimerData = () => {
        localStorage.removeItem(`quizTimer_${code}_${hostId}`);
    };

    useEffect(() => {
        // Only redirect immediately for errors other than "host has left"
        if (error && error !== "The host has left the session") {
            router.push("/");
        }
    }, [error, router]);

    // Initialize socket connection and fetch session data
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

                if (!response.data?._id) {
                    setError("Failed to fetch host data");
                    throw new MissingUserDataError("User data is missing or incomplete");
                }

                const userData = response.data;
                setHostId(userData._id);
                return userData._id;
            } catch (err) {
                if (!(err instanceof MissingUserDataError)) {
                    setError("Authentication error. Please log in again.");
                    throw new AuthenticationError("Authentication error. Please log in again.");
                }
                throw err;
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
                    return sessionData;
                } else {
                    throw new Error("Failed to fetch session data");
                }
            } catch (err) {
                // Check if the error is a 404 (not found) error
                if (err.status === 404 || err.message?.includes("not found")) {
                    setError("Quiz not found. This quiz code may not exist.");
                    // Clear loading state so the error message is visible
                    setIsLoading(false);
                    // Redirect after showing the error
                    setTimeout(() => router.push("/"), 3000);
                    return null;
                }
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

            // Determine the Socket.IO URL based on environment
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

            const newSocket = io(socketUrl, {
                path: '/socket.io',
                withCredentials: true,
                transports: ['websocket', 'polling'], // Prefer WebSocket
            });

            newSocket.on("connect", () => {
                console.log("Socket connected");
                newSocket.emit("host-session", { code, hostId });
            });

            newSocket.on("hosting-session", (data) => {
                setSessionStatus(data.status);
                setPlayers(data.players);
                setCurrentQuestionIndex(data.currentQuestionIndex);
                if (data.status === "active" && data.currentQuestionIndex >= 0) {
                    const newStartTime = Date.now();
                    storeTimerData(data.currentQuestionIndex, newStartTime);
                }
            });

            newSocket.on("player-joined", (data) => {
                fetchSessionData();
            });

            newSocket.on("player-left", (data) => {
                // Remove the player locally for immediate UI update
                setPlayers((prevPlayers) =>  // NOSONAR
                    prevPlayers.filter(player => player.id !== data.playerId)
                );
                
                // Also fetch the latest session data to ensure sync with server
                fetchSessionData();
            });

            newSocket.on("answer-submitted", (data) => {
                setPlayers((prevPlayers) => // NOSONAR
                    prevPlayers.map((player) =>
                        player.id === data.playerId ? { ...player, score: data.score } : player
                    )
                );
            });

            newSocket.on("error", (data) => {
                setError(data.message);
            });

            setSocket(newSocket);
            return newSocket;
        };

        let cleanupFn;
        const setup = async () => {
            setIsLoading(true);
            try {
                const userId = await fetchUserData();
                if (userId) {
                    const sessionData = await fetchSessionData();
                    await fetchQuizData(sessionData);
                    const newSocket = initializeSocket(userId);
                    return () => {
                        if (newSocket) {
                            console.log("Host disconnecting from socket");
                            // Explicitly disconnect, which will trigger the server-side host-disconnected event
                            newSocket.disconnect();
                        }
                    };
                }
            } catch (err) {
                console.error("Error in setup:", err);
                if (!(err instanceof AuthenticationError || err instanceof MissingUserDataError)) {
                    setError("An unexpected error occurred during setup");
                }
            } finally {
                setIsLoading(false);
            }
        };

        setup().then((fn) => {
            cleanupFn = fn;
        });

        return () => {
            if (cleanupFn && typeof cleanupFn === "function") {
                cleanupFn();
            }
            clearTimerData();
        };
    }, [code, router.isReady]);

    // Synchronize timeLeft with quiz.quizMetaData and currentQuestionIndex
    useEffect(() => {
        if (
            sessionStatus === "active" &&
            !showLeaderboard &&
            currentQuestionIndex >= 0 &&
            quiz
        ) {
            const timePerQuestion = quiz.quizMetaData?.[0]?.timePerQuestion || 60;
            const storedTimer = getStoredTimerData();

            if (
                storedTimer &&
                storedTimer.questionIndex === currentQuestionIndex &&
                storedTimer.startTime
            ) {
                const elapsedTime = (Date.now() - storedTimer.startTime) / 1000;
                const remainingTime = Math.max(0, timePerQuestion - elapsedTime);
                setTimeLeft(remainingTime);
            } else {
                setTimeLeft(timePerQuestion);
                const newStartTime = Date.now();
                storeTimerData(currentQuestionIndex, newStartTime);
            }
        }
    }, [sessionStatus, showLeaderboard, currentQuestionIndex, quiz]);

    // Timer logic
    useEffect(() => {
        if (
            sessionStatus !== "active" ||
            showLeaderboard ||
            timeLeft === null ||
            currentQuestionIndex < 0
        ) {
            clearInterval(timerIntervalRef.current);
            return;
        }

        let lastUpdate = Date.now();

        timerIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const delta = (now - lastUpdate) / 1000; // seconds
            lastUpdate = now;

            setTimeLeft(prevTime => {
                const newTime = prevTime - delta;

                if (newTime <= 0) {
                    clearInterval(timerIntervalRef.current);
                    handleNextQuestion();
                    return 0;
                }

                return newTime;
            });
        }, 100);

        return () => {
            clearInterval(timerIntervalRef.current);
        };
    }, [sessionStatus, showLeaderboard, timeLeft, currentQuestionIndex]);

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
            const newStartTime = Date.now();
            storeTimerData(data.currentQuestionIndex, newStartTime);
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

            const correctAnswer = validatedAnswers?.correctAnswer;
            setShowCorrectAnswer(true);

            if (socket && correctAnswer) {
                console.log("emitting correct answer SOCKET1 - ", correctAnswer);
                // Pass the correctAnswer to the socket event
                socket.emit("show-correct-answer", { 
                    code,
                    correctAnswer 
                });
            }

            setTimeout(async () => {
                setShowLeaderboard(true);
                if (currentQuestionIndex + 1 >= quiz.quizData.length) {
                    await handleEndQuiz();
                } else {
                    if (socket) {
                        socket.emit("waiting-for-next", { code });
                    }
                    setShowLeaderboard(true);
                    clearTimerData();
                }
            }, 2000);
        } catch (err) {
            setError(err.message || "Failed to move to next question");
            console.error("Error in handleNextQuestion:", err);
        }
    };

    const handleLeaderboardNext = async () => {
        try {
            setShowCorrectAnswer(false);

            const response = await fetchWithAuth(`/shared-quiz/${code}/next?hostId=${hostId}`);
            if (!response) {
                throw new Error("Failed to move to next question");
            }

            const data = response;
            setCurrentQuestionIndex(data.currentQuestionIndex);
            setShowLeaderboard(false);
            const newStartTime = Date.now();
            storeTimerData(data.currentQuestionIndex, newStartTime);

            if (quiz && data.currentQuestionIndex >= quiz.quizData.length) {
                await handleEndQuiz();
            }
        } catch (err) {
            setError(err.message || "Failed to move to next question");
            console.error("Error in handleLeaderboardNext:", err);
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
            setShowLeaderboard(false);
            clearTimerData();
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
        <Card className="player-view-card">
            <CardContent>
                <Box className="timer-container">
                    <Typography variant="body2" className="timer-text">
                        Waiting for players...
                    </Typography>
                    <LinearProgress
                        className="progress-bar"
                        variant="indeterminate"
                        sx={{
                            background: "#e0e0e0",
                            height: "8px",
                            borderRadius: "4px",
                            "& .MuiLinearProgress-bar": {
                                background: "linear-gradient(90deg, #6c63ff, #ff6584)",
                            },
                        }}
                    />
                </Box>
                <Box sx={{ textAlign: "center", my: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        Click Start Quiz when ready 🛸
                    </Typography>
                </Box>
                <Box className="code-display" mb={3}>
                    <Typography variant="h6" className="joined-text" sx={{ mb: 1 }}>
                        Share this code with players:
                    </Typography>
                    <Typography variant="h4" className="code-text">
                        {code}
                    </Typography>
                </Box>
                <Box mb={3}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Players ({players.length})
                    </Typography>
                    {players.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                            No players have joined yet
                        </Typography>
                    ) : (
                        <List className="players-list">
                            {players.map((player) => (
                                <ListItem
                                    key={player.id}
                                    className="player-item"
                                    sx={{
                                        mb: 1,
                                        borderRadius: "6px",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            transform: "translateY(-2px)",
                                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={player.username}
                                        sx={{
                                            "& .MuiListItemText-primary": {
                                                fontWeight: 500,
                                                fontSize: "1rem",
                                            },
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
                <Button
                    variant="contained"
                    onClick={handleStartQuiz}
                    disabled={players.length === 0}
                    className="action-button"
                >
                    Start Quiz
                </Button>
                <Box className="divider" sx={{ mt: 4 }} />
            </CardContent>
        </Card>
    );

    const renderLeaderboardView = () => (
        <Card className="host-manager-card">
            <CardHeader title={`Leaderboard - Question ${currentQuestionIndex + 1} Results`} />
            <CardContent>
                <Box mb={3}>
                    <Typography variant="h6">Current Standings</Typography>
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
                                        <ListItemText primary={`#${index + 1} ${player.username}`} />
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
                    onClick={handleLeaderboardNext}
                    className="action-button"
                >
                    {currentQuestionIndex + 1 < quiz?.quizData.length ? "Next Question" : "End Quiz"}
                </Button>
            </CardContent>
        </Card>
    );

    // Get the right answer so the host can visualize it
    useEffect(() => {
        const validateAnswers = async () => {
            const currentQuestion = getCurrentQuestion();
            if (!currentQuestion) return;

            try {
                const response = await fetch(`${apiEndpoint}/question/validate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        question_id: currentQuestion.question_id,
                        selected_answer: currentQuestion.answers[0], // any option is valid
                    }),
                });
                const data = await response.json();
                setValidatedAnswers(data);
            } catch (error) {
                console.error("Error validating answers:", error);
            }
        };

        validateAnswers();
    }, [currentQuestionIndex]);

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
                <CardContent>
                    <Box className="timer-container">
                        <Typography variant="body2" className="timer-text" id="quiz-timer">
                            Time left: {Math.ceil(timeLeft)}s
                        </Typography>
                        <LinearProgress
                            className="progress-bar"
                            variant="determinate"
                            value={(timeLeft / (quiz?.quizMetaData[0]?.timePerQuestion || 60)) * 100}
                        />
                    </Box>
                    <div className="content-box">
                        <div className="progress-indicator">
                            Question {currentQuestionIndex + 1} of {quiz?.quizData.length}
                        </div>
                        <h2 id="title-question" className="question-title">
                            {quiz.quizMetaData[0]?.quizName || "Untitled Quiz"}
                        </h2>
                        <Box className="image-box" mb={3}>
                            <img
                                src={`${apiEndpoint}${currentQuestion.image_name}`}
                                alt="Question"
                                className="quiz-image"
                            />
                        </Box>
                        {/* Side-by-side layout for options and leaderboard */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                gap: 3,
                                mb: 3,
                                alignItems: "stretch",
                            }}
                        >
                            {/* Options section */}
                            <Box>
                                <Typography variant="h6" mb={2} className="answer-options-title">
                                    Answer Options
                                </Typography>
                                <List
                                    className="options-list"
                                    sx={{
                                        height: { xs: "auto", md: "300px" },
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                    }}
                                >
                                    {currentQuestion.answers.map((option, index) => (
                                        <ListItem
                                            key={`option-${option}`}
                                            className={`option-item ${showCorrectAnswer && validatedAnswers // NOSONAR
                                                ? option === validatedAnswers.correctAnswer || // NOSONAR
                                                (option === currentQuestion.answers[0] &&
                                                    validatedAnswers.isCorrect)
                                                    ? "correct"
                                                    : "incorrect"
                                                : ""
                                            }`}
                                        >
                                            <ListItemText primary={option} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
    
                            {/* Leaderboard section */}
                            <Box>
                                <Typography variant="h6" mb={2} className="leaderboard-title">
                                    Leaderboard
                                </Typography>
                                {players.length === 0 ? (
                                    <Typography variant="body2" color="textSecondary">
                                        No players
                                    </Typography>
                                ) : (
                                    <List
                                        className="leaderboard-list"
                                        sx={{
                                            height: { xs: "auto", md: "300px" },
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                        }}
                                    >
                                        {[...players]
                                            .sort((a, b) => b.score - a.score)
                                            .map((player, index) => (
                                                <ListItem key={player.id} className="leaderboard-item">
                                                    <ListItemText
                                                        primary={`#${index + 1} ${player.username}`}
                                                    />
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {player.score}
                                                    </Typography>
                                                </ListItem>
                                            ))}
                                    </List>
                                )}
                            </Box>
                        </Box>
    
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleNextQuestion}
                            className="action-button"
                        >
                            {currentQuestionIndex + 1 < quiz?.quizData.length ? "Next Question" : "End Quiz"}
                        </Button>
                    </div>
                    <div className="divider"></div>
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
                                        <ListItemText primary={`#${index + 1} ${player.username}`} />
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
                    onClick={() => router.push("/")}
                    className="action-button"
                >
                    Go home
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
            <Typography variant="h4" className="quiz-player-header">
                WiHoot - Private Session
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {sessionStatus === "waiting" && renderWaitingRoom()}
            {sessionStatus === "active" &&
                (showLeaderboard ? renderLeaderboardView() : renderActiveQuiz())}
            {sessionStatus === "finished" && renderFinishedQuiz()}
        </Container>
    );
}