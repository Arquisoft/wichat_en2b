"use client"

import React, { useState, useEffect } from "react"
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
    CircularProgress,
} from "@mui/material";
import InGameChat from "@/components/game/InGameChat";
import "../../../styles/wihoot/PlayerView.css"
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
    const [quiz, setQuiz] = useState(null)
    const [quizMetaData, setQuizMetaData] = useState(null)
    const [selectedOption, setSelectedOption] = useState(null)
    const [isCorrect, setIsCorrect] = useState(false)
    const [correctAnswer, setCorrectAnswer] = useState(null)
    const [hasAnswered, setHasAnswered] = useState(false)
    const [startTime, setStartTime] = useState(null)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    // Initialize socket connection and fetch session data
    useEffect(() => {
        if (!code || !playerId) return

        const fetchUserData = async () => {
            if (playerId.startsWith("guest_")) {
                // For guest users, we don't need to fetch user data
                setIsGuest(true)
                return
            }

            try {
                const response = await fetchWithAuth("/token/username")
                if (response) {
                    const userData = response
                    setUsername(userData.username)
                    return userData
                } else {
                    throw new Error("Failed to get user data")
                }
            } catch (err) {
                setError("Authentication error. Please log in again.")
                console.error(err)
                return null
            }
        }

        const fetchSessionData = async () => {
            try {
                const response = await fetchWithAuth(`/shared-quiz/${code}/status`)
                if (response) {
                    const sessionData = response
                    setSessionStatus(sessionData.status)
                    setPlayers(sessionData.players)
                    setCurrentQuestionIndex(sessionData.currentQuestionIndex)

                    // Find player in the session
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
                    setQuiz(quiz.quizData)
                    setQuizMetaData(quiz.quizMetaData)
                    console.log("quizMetadata hook TEST_:", quizMetaData)
                    console.log("Quiz data fetched:", quiz)
                } else {
                    throw new Error("Failed to fetch quiz data")
                }
            } catch (err) {
                setError("Failed to load quiz data")
                console.error(err)
            }
        }

        const initializeSocket = () => {
            // Connect to socket server
            const newSocket = io(process.env.SOCKET_SERVER || "http://localhost:8006")

            newSocket.on("connect", () => {
                console.log("Socket connected")

                // Join as player
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
                fetchSessionData();
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
            })

            newSocket.on("question-changed", (data) => {
                setCurrentQuestionIndex(data.currentQuestionIndex)
                setStartTime(Date.now())
                setHasAnswered(false)
                setSelectedOption(null)
            })

            newSocket.on("session-ended", (data) => {
                setSessionStatus("finished")
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

    const getCurrentQuestion = () => {
        if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.length) {
            return null
        }
        return quiz[currentQuestionIndex]
    }

    const handleAnswerSubmit = async (optionIndex) => {
        if (hasAnswered) return

        const currentQuestion = getCurrentQuestion()
        if (!currentQuestion) return

        setSelectedOption(optionIndex)
        setHasAnswered(true)

        const timeToAnswer = Date.now() - startTime
        const validateOutput =  await fetch(`${apiEndpoint}/question/validate`, {
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
        console.log("Player id:", playerId)
        console.log("Question id:", currentQuestion.question_id)
        console.log("Answer id:", optionIndex)
        console.log("Time to answer:", timeToAnswer)
        console.log("Number of questions:", currentQuestion.answers.length)
        
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
                    timeToAnswer,
                    numberOfQuestions: currentQuestion.answers.length
                }),
            })
        } catch (err) {
            console.error("Failed to submit answer:", err)
        }
    }

    const renderWaitingRoom = () => (
        <Card className="player-view-card">
            <CardHeader title="Waiting for Host to Start" />
            <CardContent>
                <Box className="code-display" mb={3}>
                    <Typography variant="h6">You've joined with code:</Typography>
                    <Typography variant="h4" className="code-text">
                        {code}
                    </Typography>
                </Box>
                <Box mb={3}>
                    <Typography variant="h6">Players ({players.length})</Typography>
                    <List className="players-list">
                        {players.map((player) => (
                            <ListItem key={player.id} className="player-item">
                                <ListItemText primary={player.username} />
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
                <Typography variant="body2" color="textSecondary" align="center">
                    The host will start the quiz soon. Get ready!
                </Typography>
            </CardContent>
        </Card>
    );

    const renderActiveQuiz = () => {
        const currentQuestion = getCurrentQuestion();
        const player = players.find((p) => p.id === playerId);

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
                        {quizMetaData?.question || "Untitled Quiz"}
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
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push("/shared-quiz/join")}
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
            <Typography variant="h4" gutterBottom>
                Quiz Player - {username}
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
