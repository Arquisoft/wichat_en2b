"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Box, Typography, Button, TextField, Container, Paper, Alert } from "@mui/material"
import GameConnecting from "@/components/wihoot/game/Connecting"
import axios from "axios"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000"

export default function JoinGame() {
    const router = useRouter()
    const [gameCode, setGameCode] = useState("")
    const [playerName, setPlayerName] = useState("")
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isJoining, setIsJoining] = useState(false)

    useEffect(() => {
        // Check if user is authenticated
        const checkAuth = async () => {
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("token="))
                ?.split("=")[1]

            if (token) {
                setIsAuthenticated(true)

                try {
                    // Fetch username
                    const userResponse = await axios.get(`${apiEndpoint}/token/username`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    })

                    setPlayerName(userResponse.data.username)
                } catch (error) {
                    console.error("Error fetching user data:", error)
                }
            }
        }

        checkAuth()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage("")

        if (!gameCode || gameCode.length !== 6) {
            setErrorMessage("Please enter a valid 6-digit game code")
            return
        }

        if (!playerName.trim()) {
            setErrorMessage("Please enter your name")
            return
        }

        setIsLoading(true)
        setIsJoining(true)

        try {
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("token="))
                ?.split("=")[1]

            const headers = {
                "Content-Type": "application/json"
            };

            // Only add Authorization if authenticated and token exists
            if (isAuthenticated && token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await axios.post(`${apiEndpoint}/shared-quiz/${gameCode}/join`,
            { playerName: playerName, isGuest: !isAuthenticated },
            { headers }
            );

            if (response.status === 200) {
                router.push({
                    pathname: "/wihoot/play",
                    query: {
                        code: gameCode,
                        playerName: playerName,
                    },
                })
            } else {
                setErrorMessage(response.data.error || "Failed to join game")
                setIsLoading(false)
                setIsJoining(false)
            }
        } catch (error) {
            console.error("Error joining game:", error)
            setErrorMessage(error.response?.data?.error || "An error occurred while joining the game")
            setIsLoading(false)
            setIsJoining(false)
        }
    }

    if (isLoading) {
        return <GameConnecting />
    }

    return (
        <Container maxWidth="md">
            <Box
                sx={{
                    my: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
                className="home-container"
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        width: "100%",
                        borderRadius: 2,
                        textAlign: "center",
                    }}
                >
                    <Box component="div" sx={{ mb: 4 }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                            Join a Game
                        </Typography>

                        {errorMessage && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {errorMessage}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                            <TextField
                                fullWidth
                                label="Game Code"
                                variant="outlined"
                                placeholder="Enter 6-digit game code"
                                value={gameCode}
                                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                                inputProps={{
                                    maxLength: 6,
                                }}
                                disabled={isJoining}
                                margin="normal"
                            />

                            <TextField
                                fullWidth
                                label="Your Name"
                                variant="outlined"
                                placeholder={isAuthenticated ? "Your name (pre-filled)" : "Your name"}
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                disabled={isJoining || isAuthenticated}
                                margin="normal"
                                sx={{ mb: 2 }}
                            />

                            <Button type="submit" variant="contained" color="primary" fullWidth disabled={isJoining} sx={{ py: 1.5 }}>
                                {isJoining ? "Joining..." : "Join Game"}
                            </Button>
                        </Box>
                    </Box>

                    {!isAuthenticated && (
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="body1" gutterBottom>
                                Want to create your own quizzes?
                            </Typography>

                            <Link href="/login" passHref>
                                <Button variant="outlined" color="primary">
                                    Log In
                                </Button>
                            </Link>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Container>
    )
}
