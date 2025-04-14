import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Box, Typography, Button, TextField, Container, Paper, Grid, Alert} from "@mui/material";
import GameConnecting from "./Connecting";
import "../styles/home.css";
import axios from "axios";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function JoinGame() {
    const router = useRouter();
    const [gameCode, setGameCode] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    useEffect(async () => {
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        if (token) {
            setIsAuthenticated(true);

            try {
                // Fetch username
                const userResponse = await axios.get(`${apiEndpoint}/token/username`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                setPlayerName(userResponse.data.username);

                // Fetch profile picture after username is fetched
                const imgRes = await fetch(`${apiEndpoint}/user/profile/picture/${userResponse.data.username}`);

                if (imgRes.ok) {
                    const imgURL = await imgRes.json();
                    setProfilePicture(`${apiEndpoint}/${imgURL.profilePicture}`);
                } else {
                    console.error("Failed to fetch profile picture.");
                }

            } catch (error) {
                setPlayerName(null); // Set username to null if there's an error
                console.error("Error fetching data:", error);
                return;
            }
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!gameCode || gameCode.length !== 6) {
            setErrorMessage("Please enter a valid 6-digit game code");
            return;
        }

        if (!playerName.trim()) {
            setErrorMessage("Please enter your name");
            return;
        }

        setIsLoading(true);

        try{

            const response = await axios.post(`/wihoot/${gameCode}/join`,
                {
                    playerName: playerName,
                    isGuest: isAuthenticated? true : false
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 200) {
                router.push(`/wihoot/create`);
                return;
            } else {
                setErrorMessage(response.data.error);
            }

        } catch(error) {
            setErrorMessage("An error occurred while joining the game");
            setIsLoading(false);
            setIsJoining(false);
        }

    };

    return
    if (isLoading) {
        return <GameConnecting/>
    } else {
        return (
            <Container maxWidth="md">
                <Box
                    sx={{
                        my: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                    className="home-container"
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            width: '100%',
                            borderRadius: 2,
                            textAlign: 'center'
                        }}
                    >

                        <Box component="div" sx={{mb: 4}}>
                            <Typography variant="h5" component="h2" gutterBottom>
                                Join a Game
                            </Typography>

                            {errorMessage && (
                                <Alert severity="error" sx={{mb: 2}}>
                                    {errorMessage}
                                </Alert>
                            )}

                            <Box component="form" onSubmit={handleSubmit} sx={{mt: 2}}>
                                <TextField
                                    fullWidth
                                    label="Game Code"
                                    variant="outlined"
                                    placeholder="Enter 6-digit game code"
                                    value={gameCode}
                                    onChange={(e) => setGameCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                                    inputProps={{
                                        maxLength: 6,
                                        pattern: "[0-9]{6}"
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
                                    disabled={isJoining}
                                    margin="normal"
                                    sx={{mb: 2}}
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    disabled={isJoining}
                                    sx={{py: 1.5}}
                                >
                                    {isJoining ? "Joining..." : "Join Game"}
                                </Button>
                            </Box>
                        </Box>

                        { !isAuthenticated ? (
                            <Box sx={{mt: 4}}>
                                <Typography variant="body1" gutterBottom>
                                    Want to create your own quizzes?
                                </Typography>

                                <Link href="/login" passHref style={{textDecoration: 'none'}}>
                                    <Button variant="outlined" color="primary">
                                        Log In
                                    </Button>
                                </Link>

                            </Box>
                        ) : (null) }
                    </Paper>
                </Box>
            </Container>
        );
    }
}