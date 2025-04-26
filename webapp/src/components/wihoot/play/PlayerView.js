"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import { fetchWithAuth } from "../../../utils/api-fetch-auth"
import io from "socket.io-client"
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Button,
    Alert,
    List,
    ListItem,
    ListItemText,
    Badge,
    Grid,
    CircularProgress, LinearProgress,
} from "@mui/material";
import InGameChat from "@/components/game/InGameChat";
import "../../../styles/wihoot/PlayerView.css";
import "../../../styles/QuestionGame.css";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function PlayerView() {
    const router = useRouter()
    const { code, playerId } = router.query

    const [socket, setSocket] = useState(null)
    const [username, setUsername] = useState("")
    const [isGuest, setIsGuest] = useState(false)
    const [sessionStatus, setSessionStatus] = useState("waiting")
    const [players, setPlayers] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
    const [quizData, setQuizData] = useState(null)
    const [quizMetaData, setQuizMetaData] = useState(null)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isCorrect, setIsCorrect] = useState(false)
    const [correctAnswer, setCorrectAnswer] = useState(null)
    const [hasAnswered, setHasAnswered] = useState(false)
    const [startTime, setStartTime] = useState(null)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [waitingForNext, setWaitingForNext] = useState(false)
    const [answers, setAnswers] = useState([]);
    const [hasSavedGame, setHasSavedGame] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null)
    const timerIntervalRef = useRef(null)

    // Initialize socket connection and fetch session data
    useEffect(() => {
        if (!code || !playerId) return;

        const fetchUserData = async () => {
            if (playerId.startsWith("guest_")) {
                setIsGuest(true);
                setUsername(`Guest_${playerId}`);
                return;
            }

            try {
                const response = await fetchWithAuth("/token/username");
                if (response) {
                    const userData = response;
                    setUsername(userData.username);
                    return userData;
                } else {
                    throw new Error("Failed to get user data");
                }
            } catch (err) {
                setError("Authentication error. Please log in again.");
                console.error(err);
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

                    const player = sessionData.players.find((p) => p.id === playerId)
                    if (player) {
                        setUsername(player.username)
                        setIsGuest(player.isGuest)
                    }

                    return sessionData
                } else {
                    throw new Error("Failed to fetch session data")
                }
            } catch (err) {
                setError("Failed to load session data")
                console.error(err)
                return null
            }
        }

        const fetchQuizData = async (sessionData) => {
            if (!sessionData) return

            try {
                const response = await fetchWithAuth(`/internal/quizdata/${code}`)
                if (response) {
                    const quiz = response
                    setQuizData(quiz.quizData)
                    setQuizMetaData(quiz.quizMetaData)
                    setTimeLeft(quiz.quizMetaData[0]?.timerDuration || 60)
                } else {
                    throw new Error("Failed to fetch quiz data")
                }
            } catch (err) {
                setError("Failed to load quiz data")
                console.error(err)
            }
        }

        const initializeSocket = () => {
            const newSocket = io(process.env.SOCKET_SERVER || "http://localhost:8006")

            newSocket.on("connect", () => {
                console.log("Socket connected")

                newSocket.emit("join-session", {
                    code,
                    playerId,
                    username,
                    isGuest,
                })
            })

            newSocket.on("joined-session", (data) => {
                fetchSessionData()
            })

            newSocket.on("player-joined", (data) => {
                fetchSessionData()
            })

            newSocket.on("player-left", (data) => {
                fetchSessionData()
            })

            newSocket.on("session-started", (data) => {
                setSessionStatus("active")
                setCurrentQuestionIndex(data.currentQuestionIndex)
                setStartTime(Date.now())
                setHasAnswered(false)
                setSelectedOption(null)
                setWaitingForNext(false)
                setTimeLeft(quizMetaData?.[0]?.timerDuration || 60)
            })

            newSocket.on("question-changed", (data) => {
                setCurrentQuestionIndex(data.currentQuestionIndex)
                setStartTime(Date.now())
                setHasAnswered(false)
                setSelectedOption(null)
                setWaitingForNext(false)
                setTimeLeft(quizMetaData?.[0]?.timerDuration || 60)
            })

            newSocket.on("waiting-for-next", () => {
                setWaitingForNext(true)
            })

            newSocket.on("session-ended", (data) => {
                setSessionStatus("finished")
                setPlayers(data.players)
                setWaitingForNext(false)
            })

            newSocket.on("score-updated", (data) => {
                setPlayers(data.players)
            })

            newSocket.on("error", (data) => {
                setError(data.message)
            })

            setSocket(newSocket)

            return newSocket
        }

        const setup = async () => {
            setIsLoading(true)
            try {
                await fetchUserData()
                const sessionData = await fetchSessionData()
                await fetchQuizData(sessionData)
                const newSocket = initializeSocket()

                return () => {
                    if (newSocket) newSocket.disconnect()
                }
            } finally {
                setIsLoading(false)
            }
        }

        const cleanup = setup()
        return () => {
            if (cleanup && typeof cleanup === "function") {
                cleanup()
            }
        }
    }, [code, playerId, username, isGuest])

    // Save game data when quiz ends
    useEffect(() => {
        if (sessionStatus === "finished" && !hasSavedGame && !isGuest) {
            saveGameData();
            setHasSavedGame(true);
        }
    }, [sessionStatus, hasSavedGame, isGuest]);


    // Timer logic
    useEffect(() => {
        if (
            sessionStatus !== "active" ||
            waitingForNext ||
            hasAnswered ||
            timeLeft === null ||
            currentQuestionIndex < 0
        ) {
            clearInterval(timerIntervalRef.current)
            return
        }

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 0) {
                    clearInterval(timerIntervalRef.current)
                    return 0
                }
                return prevTime - 0.01
            })
        }, 10)

        return () => {
            clearInterval(timerIntervalRef.current)
        }
    }, [sessionStatus, waitingForNext, hasAnswered, timeLeft, currentQuestionIndex])

    const getCurrentQuestion = () => {
        if (!quizData || currentQuestionIndex < 0 || currentQuestionIndex >= quizData.length) {
            return null
        }
        return quizData[currentQuestionIndex]
    }

    const handleAnswerSubmit = async (optionIndex) => {
        if (hasAnswered) return

        const currentQuestion = getCurrentQuestion()
        if (!currentQuestion) return

        setSelectedOption(optionIndex)
        setHasAnswered(true)

        const timeToAnswer = Date.now() - startTime
        const validateOutput = await fetch(`${apiEndpoint}/question/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question_id: currentQuestion.question_id,
                selected_answer: currentQuestion.answers[optionIndex]
            }),
        });
        const { isCorrect, correctAnswer } = await validateOutput.json();
        setIsCorrect(isCorrect);
        setCorrectAnswer(correctAnswer);

        // Calculate points (same as backend: 1000 - timeToAnswer, min 100)
        const points = isCorrect ? Math.max(1000 - Math.floor(timeToAnswer), 100) : 0;

        // Store answer
        setAnswers((prev) => [
            ...prev,
            {
                questionId: currentQuestion.question_id,
                answerId: optionIndex,
                isCorrect,
                timeSpent: timeToAnswer,
                points,
            },
        ]);

        try {
            await fetch(`${apiEndpoint}/shared-quiz/${code}/answer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    playerId,
                    questionId: currentQuestion.question_id,
                    answerId: optionIndex,
                    isCorrect,
                    timeToAnswer
                }),
            })

            const sessionData = await fetchWithAuth(`/shared-quiz/${code}/status`)
            if (sessionData) {
                setPlayers(sessionData.players)
            }
        } catch (err) {
            console.error("Failed to submit answer or fetch session data:", err);
        }
    };

    const saveGameData = async () => {
        if (isGuest) {
            console.log("Skipping game data save for guest user");
            return;
        }

        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        if (!token) {
            console.error("No token found, cannot save game data");
            return;
        }

        try {
            const player = players.find((p) => p.id === playerId);
            const pointsGain = player ? player.score : 0;
            const numberOfQuestions = answers.length;
            const numberCorrectAnswers = answers.filter((a) => a.isCorrect).length;
            const totalTime = answers.reduce((acc, a) => acc + a.timeSpent, 0);

            const response = await fetch(`${apiEndpoint}/game`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    subject: quizMetaData[0]?.category.toLowerCase() || quizMetaData[0]?.quizName.toLowerCase() || "unknown",
                    points_gain: pointsGain,
                    number_of_questions: numberOfQuestions,
                    number_correct_answers: numberCorrectAnswers,
                    total_time: totalTime,
                })
            });

            if (!response.ok) {
                throw new Error("Failed to save game data");
            }

            console.log("Game data saved successfully");
        } catch (err) {
            console.error("Error saving game data:", err);
        }
    };

    const renderWaitingRoom = () => (
        <Card className="player-view-card">
            <CardContent>
                {/* Timer-like progress bar */}
                <Box className="timer-container">
                    <Typography variant="body2" className="timer-text">
                        Waiting for host...
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
                        Get ready for the quiz!🚀
                    </Typography>
                </Box>
                <Box className="code-display" mb={4}>
                    <Typography variant="h6" className="joined-text" sx={{ mb: 1 }}>
                        You've joined with code:
                    </Typography>
                    <Typography variant="h4" className="code-text">
                        {code}
                    </Typography>
                </Box>
                <Box mb={3}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Players ({players.length})
                    </Typography>
                    <List className="players-list">
                        {players.map((player) => (
                            <ListItem
                                key={player.id}
                                className={`player-item ${player.id === playerId ? "current-player" : ""}`}
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
                                <ListItemText primary={player.username} sx={{
                                    "& .MuiListItemText-primary": {
                                        fontWeight: 500,
                                        fontSize: "1rem",
                                    },
                                }} />
                                {player.isGuest && (
                                    <Badge badgeContent="Guest" color="secondary" sx={{ mr: 1 }} />
                                )}
                                {player.id === playerId && (
                                    <Badge badgeContent="You" color="primary" />
                                )}
                            </ListItem>
                        ))}
                    </List>
                </Box>

                <Box
                    sx={{
                        textAlign: "center",
                        p: 3,
                        borderRadius: "8px",
                        background: "linear-gradient(to right, #f5f5f5, #ffffff, #f5f5f5)",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    }}
                >
                <Typography variant="body1" sx={{ fontWeight: 500, color: "#555" }}>
                    The host will start the quiz soon. Get ready!
                </Typography>
                </Box>

                {/* Gradient divider at the bottom */}
                <Box className="divider" sx={{ mt: 4 }} />
            </CardContent>
        </Card>
    )

    const renderLeaderboardView = () => (
        <Card className="player-view-card">
            <CardHeader title={`Leaderboard - Question ${currentQuestionIndex + 1} Results`} />
            <CardContent>
                <Box mb={3}>
                    <Typography variant="h6">Current Standings</Typography>
                    {players.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                            No players
                        </Typography>
                    ) : (
                        <List className="results-list">
                            {[...players]
                                .sort((a, b) => b.score - a.score)
                                .map((player, index) => (
                                    <ListItem
                                        key={player.id}
                                        className={`result-item ${
                                            player.id === playerId ? "current-player" : ""
                                        }`}
                                    >
                                        <ListItemText
                                            primary={`#${index + 1} ${player.username}`}
                                            secondary={
                                                <>
                                                    {player.isGuest && (
                                                        <Badge
                                                            badgeContent="Guest"
                                                            color="secondary"
                                                            sx={{ mr: 1 }}
                                                        />
                                                    )}
                                                    {player.id === playerId && (
                                                        <Badge badgeContent="You" sx={{
                                                            "& .MuiBadge-badge": {
                                                                backgroundColor: "#6c63ff",
                                                                color: "white",
                                                            },
                                                        }} />
                                                    )}
                                                </>
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
                <Typography variant="body2" color="textSecondary" align="center">
                    Waiting for the host to proceed to the next question...
                </Typography>
            </CardContent>
        </Card>
    )

    const renderActiveQuiz = () => {
        const currentQuestion = getCurrentQuestion()
        const player = players.find((p) => p.id === playerId)

        if (!currentQuestion) {
            return (
                <Card className="player-view-card">
                    <CardContent>
                        <Typography variant="h6" align="center">
                            Loading question...
                        </Typography>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card className="content-box">
                <CardContent>
                    {/* Timer and progress bar */}
                    <Box className="timer-container" >
                        <Typography variant="body2" className="timer-text" id='quiz-timer'>
                            Time left: {Math.ceil(timeLeft)}s
                        </Typography>
                        <LinearProgress
                            className="progress-bar"
                            variant="determinate"
                            value={(timeLeft / (quizMetaData?.[0]?.timerDuration || 60)) * 100}
                        />
                    </Box>
                    {hasAnswered && isCorrect && (
                        <Alert severity="success" className="alert-box" sx={{ mb: 2 }}>
                            Great job! You got it right!
                        </Alert>
                    )}
                    {hasAnswered && !isCorrect && (
                        <Alert severity="error" className="alert-box" sx={{ mb: 2 }}>
                            Oops! You didn't guess this one.
                        </Alert>
                    )}
                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="h5">
                            Question {currentQuestionIndex + 1}
                        </Typography>
                        <Box textAlign="right">
                            <Typography variant="body2" color="textSecondary">
                                Your Score
                            </Typography>
                            <Typography variant="h6">{player?.score || 0}</Typography>
                        </Box>
                    </Box>
                    <Typography variant="h6" className="question-title" mb={2}>
                        {quizMetaData?.[0]?.question || "Untitled Quiz"}
                    </Typography>
                    <Box className="image-box" mb={3}>
                        <img
                            src={`${apiEndpoint}${currentQuestion.image_name}`}
                            alt="Question"
                            className="quiz-image"
                        />
                    </Box>
                    <Grid container spacing={2}>
                        {currentQuestion.answers.map((option, index) => (
                            <Grid item xs={12} md={6} key={option}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => handleAnswerSubmit(index)}
                                    disabled={hasAnswered}
                                    className={`quiz-option ${
                                        selectedOption === index ? "selected" : ""
                                    } ${
                                        hasAnswered && selectedOption === index && isCorrect
                                            ? "correct-answer"
                                            : ""
                                    } ${
                                        hasAnswered && !isCorrect && correctAnswer === option
                                            ? "correct-answer"
                                            : ""
                                    }`}
                                >
                                    {option}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>

                    <InGameChat initialMessages={[]} question={currentQuestion} />
                </CardContent>
            </Card>
        );
    };

    const renderFinishedQuiz = () => (
        <Card className="player-view-card">
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
                                    <ListItem
                                        key={player.id}
                                        className={`result-item ${
                                            player.id === playerId ? "current-player" : ""
                                        }`}
                                    >
                                        <ListItemText
                                            primary={`#${index + 1} ${player.username}`}
                                            secondary={
                                                <>
                                                    {player.isGuest && (
                                                        <Badge
                                                            badgeContent="Guest"
                                                            color="secondary"
                                                            sx={{ mr: 1 }}
                                                        />
                                                    )}
                                                    {player.id === playerId && (
                                                        <Badge badgeContent="You" color="primary" />
                                                    )}
                                                </>
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
                    onClick={() => router.push("/wihoot/join")}
                >
                    Join Another Quiz
                </Button>
            </CardContent>
        </Card>
    );

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
                Quiz Player - {username}
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {sessionStatus === "waiting" && renderWaitingRoom()}
            {sessionStatus === "active" && (waitingForNext ? renderLeaderboardView() : renderActiveQuiz())}
            {sessionStatus === "finished" && renderFinishedQuiz()}
        </Container>
    );
}