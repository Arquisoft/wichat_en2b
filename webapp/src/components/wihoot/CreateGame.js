"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { fetchWithAuth } from "../../utils/api-fetch-auth"
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Typography,
    TextField,
    Select,
    MenuItem,
    Button,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
} from "@mui/material"
import "../../styles/wihoot/CreateGame.css"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function CreateGame() {
    const [topics, setTopics] = useState([])
    const [selectedTopic, setSelectedTopic] = useState("")
    const [numberOfQuestions, setNumberOfQuestions] = useState(5)
    const [numberOfAnswers, setNumberOfAnswers] = useState(4)
    const [difficultySelected, setDifficultySelected] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        // Fetch available topics
        const fetchTopics = async () => {
            try {
                const response = await fetchWithAuth(`/quiz/allTopics`);
                if (response) {
                    const data = response
                    setTopics(data)
                    if (data.length > 0) {
                        setSelectedTopic(data[0])
                    }
                } else {
                    setError("Failed to fetch topics")
                }
            } catch (err) {
                setError("Error fetching topics")
                console.error(err)
            }
        }

        fetchTopics()
    }, [])

    const handleCreateQuiz = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const quizzesForTopic = await fetchWithAuth(`/quiz/${selectedTopic}`);
            const quizzes = quizzesForTopic
            if (quizzes.length === 0) {
                setError("No quizzes available for the selected topic.")
                return
            }
            let quizRequested = quizzes.find(quiz => quiz.difficulty === difficultySelected);

            if (!quizRequested) {
                setError("No quiz found for the difficulty selected.")
            }

            if (quizRequested.length > 1) {
                //Take one of the quizzes random
                const randomIndex = Math.floor(Math.random() * quizRequested.length);
                quizRequested = quizRequested[randomIndex];
            }
            // First, create a quiz
            const quizResponse = await fetchWithAuth(`/game/${quizRequested.wikidataCode}/${numberOfQuestions}/${numberOfAnswers}`)

            // Get user info from token
            const userData = await fetchWithAuth("/token/username")

            const hostId = userData._id
            const hostUsername = userData.username
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("token="))
                ?.split("=")[1];

            // Create a shared quiz session
            const sessionResponse = await fetch(`${apiEndpoint}/shared-quiz/create`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        quizData: quizResponse,  //constains the questions and answers
                        quizMetaData: quizRequested, //contains quiz question, time estimated, ...
                        hostId,
                        hostUsername
                    })
                }
            );


            if (!sessionResponse.ok) {
                throw new Error("Failed to create shared quiz session")
            }

            const sessionData = await sessionResponse.json()

            // Redirect to host manager page
            router.push( { pathname: `/wihoot/host/manager`, query: { code: sessionData.code } } )
        } catch (err) {
            setError(err.message || "Failed to create shared quiz")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Box className="create-game-container" sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
            <Card className="create-game-card" sx={{ maxWidth: 600, width: '100%', m: 2, boxShadow: 3 }}>
                <CardHeader
                    className="create-game-header"
                    title={<Typography className="create-game-title" variant="h4" component="h1" align="center">Create a Shared Quiz</Typography>}
                    subheader={<Typography className="create-game-subheader" variant="body2" color="textSecondary" align="center">
                        Create a quiz and share it with friends using a unique code.
                    </Typography>}
                />
                <CardContent className="create-game-content">
                    {error && (
                        <Alert className="create-game-error" severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box component="form" className="create-game-form" onSubmit={handleCreateQuiz} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControl fullWidth required>
                            <InputLabel id="topic-label">Topic</InputLabel>
                            <Select
                                data-testid="topic-select"
                                className="create-game-select"
                                labelId="topic-label"
                                id="topic"
                                value={selectedTopic}
                                label="Topic"
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                disabled={isLoading}
                            >
                                <MenuItem value="" disabled>Select a topic</MenuItem>
                                {topics.map((topic) => (
                                    <MenuItem key={topic} value={topic}>
                                        {topic}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            data-testid="questions-input"
                            className="create-game-textfield"
                            id="questions"
                            label="Number of Questions"
                            type="number"
                            InputProps={{ inputProps: { min: 1, max: 20 } }}
                            value={numberOfQuestions}
                            onChange={(e) => setNumberOfQuestions(Number.parseInt(e.target.value))}
                            fullWidth
                            disabled={isLoading}
                            required
                        />

                        <TextField
                            data-testid="answers-input"
                            className="create-game-textfield"
                            id="answers"
                            label="Number of Answers"
                            type="number"
                            InputProps={{ inputProps: { min: 4, max: 6 } }}
                            value={numberOfAnswers}
                            onChange={(e) => setNumberOfAnswers(Number.parseInt(e.target.value))}
                            fullWidth
                            disabled={isLoading}
                            required
                        />

                        <FormControl fullWidth required>
                            <InputLabel id="difficulty-label">Difficulty</InputLabel>
                            <Select
                                data-testid="difficulty-input"
                                className="create-game-select"
                                labelId="difficulty-label"
                                id="difficultySelected"
                                value={difficultySelected}
                                label="Difficulty"
                                onChange={(e) => setDifficultySelected(e.target.value)}
                                disabled={isLoading}
                            >
                                <MenuItem value={1}>Easy</MenuItem>
                                <MenuItem value={2}>Medium</MenuItem>
                                <MenuItem value={3}>Hard</MenuItem>
                                <MenuItem value={4}>Hell</MenuItem>
                            </Select>
                        </FormControl>

                        <Button
                            data-testid="create-quiz-button"
                            className="create-game-button"
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={isLoading}
                            startIcon={isLoading && <CircularProgress size={20} />}
                            sx={{ mt: 2, py: 1.5 }}
                        >
                            {isLoading ? "Creating..." : "Create Shared Quiz"}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    )
}
