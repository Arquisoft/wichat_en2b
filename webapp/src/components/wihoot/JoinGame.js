"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import NextLink from "next/link"
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
} from "@mui/material"
import GameConnecting from "@/components/wihoot/game/Connecting"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"
import "../../styles/wihoot/JoinGame.css"

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
                try {
                    // Fetch username
                    const userResponse = await axios.get(`${apiEndpoint}/token/username`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    })
                    if (userResponse.data){
                        setIsAuthenticated(true)
                        setPlayerName(userResponse.data.username)
                    }
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

            let playerId
            let headers = { "Content-Type": "application/json" }

            if (isAuthenticated && token) {

                playerId = playerName

            } else {
                // For guest users, generate a unique ID
                playerId = "guest_"+uuidv4()
            }

            const response = await axios.post(
                `${apiEndpoint}/shared-quiz/${gameCode}/join`,
                {
                    username: playerName, // Changed from playerName to username
                    isGuest: !isAuthenticated,
                    playerId: playerId,
                },
                { headers }
            )

            if (response.status === 200) {
                router.push({
                    pathname: "/wihoot/play",
                    query: {
                        code: gameCode,
                        playerId: playerId,
                    },
                })
            } else {
                setErrorMessage(response.data.error || "Failed to join game")
                setIsLoading(false)
                setIsJoining(false)
            }
        } catch (error) {
            console.error("Error joining game", error)
            setErrorMessage(error.response?.data?.error || "An error occurred while joining the game")
            setIsLoading(false)
            setIsJoining(false)
        }
    }

    if (isLoading) {
        return <GameConnecting />
    }

    return (
        <Box className="join-game-container" sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
            <Card className="join-game-card" sx={{ maxWidth: 600, width: '100%', m: 2, boxShadow: 3 }}>
                <CardHeader
                    className="join-game-header"
                    title={<Typography className="join-game-title" variant="h4" component="h1" align="center">Join a Game</Typography>}
                    subheader={<Typography className="join-game-subheader" variant="body2" color="textSecondary" align="center">
                        Enter a 6-digit game code to join a shared quiz.
                    </Typography>}
                />
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <NextLink href="/" passHref>
                        <Button
                            variant="outlined"
                            color="secondary"
                            sx={{ mt: 2 }}
                            className="back-button"
                        >
                            Go back
                        </Button>
                    </NextLink>
                </Box>
                <CardContent className="join-game-content">
                    {errorMessage && (
                        <Alert className="join-game-error" severity="error" sx={{ mb: 2 }}>
                            {errorMessage}
                        </Alert>
                    )}
                    <Box component="form" className="join-game-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            className="join-game-textfield"
                            fullWidth
                            label="Game Code"
                            variant="outlined"
                            placeholder="Enter 6-digit game code"
                            value={gameCode}
                            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                            inputProps={{ maxLength: 6 }}
                            disabled={isJoining}
                        />
                        <TextField
                            className="join-game-textfield"
                            fullWidth
                            label="Your Name"
                            variant="outlined"
                            placeholder={isAuthenticated ? "Your name (pre-filled)" : "Your name"}
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            disabled={isJoining || isAuthenticated}
                        />
                        <Button
                            className="join-game-button"
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={isJoining}
                            startIcon={isJoining && <CircularProgress size={20} />}
                            sx={{ py: 1.5 }}
                        >
                            {isJoining ? "Joining..." : "Join Game"}
                        </Button>
                    </Box>
                    {!isAuthenticated && (
                        <Box className="join-game-login" sx={{ mt: 4, textAlign: 'center' }}>
                            <Typography variant="body1" gutterBottom>
                                Want to create your own quizzes?
                            </Typography>
                            <NextLink href="/login" passHref>
                                <Button className="join-game-login-button" variant="outlined" color="primary">
                                    Log In
                                </Button>
                            </NextLink>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    )
}
