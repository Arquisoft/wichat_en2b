"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import NextLink from "next/link"
import { fetchWithAuth } from "../../utils/api-fetch-auth"
import "../../styles/wihoot/CreateGame.css"

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

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function CreateGame() {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [subcategories, setSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [numberOfQuestions, setNumberOfQuestions] = useState(5);
    const [numberOfAnswers, setNumberOfAnswers] = useState(4);
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    // Fetch all available categories when component mounts
    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoading(true);
            try {
                const response = await fetchWithAuth(`/quiz`);
                if (response && Array.isArray(response)) {
                    // Format categories like in CustomView
                    const formattedCategories = Object.values(
                        response.reduce((acc, quiz) => {
                            const category = quiz.category;
                            acc[category] = {
                                name: category,
                            };
                            return acc;
                        }, {})
                    );
                    
                    setCategories(formattedCategories);
                    
                    // Set default category if available
                    if (formattedCategories.length > 0) {
                        setSelectedCategory(formattedCategories[0].name);
                        await fetchSubcategories(formattedCategories[0].name);
                    }
                } else {
                    setError("Failed to fetch categories: Invalid response format");
                    console.error("Invalid categories response:", response);
                }
            } catch (err) {
                setError("Error fetching categories: " + (err.message || "Unknown error"));
                console.error("Error fetching categories:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // Fetch subcategories when category changes
    const fetchSubcategories = async (category) => {
        if (!category) return;

        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`/quiz/${category}`);
            if (response && Array.isArray(response)) {
                // Map data exactly like in CustomView
                const mappedQuizzes = response.map((quiz) => ({
                    title: quiz.quizName,
                    difficulty: quiz.difficulty,
                    wikidataCode: quiz.wikidataCode,
                    question: quiz.question,
                }));
                
                setSubcategories(mappedQuizzes);
                
                // Set default subcategory if available
                if (mappedQuizzes.length > 0) {
                    setSelectedSubcategory(mappedQuizzes[0]);
                } else {
                    setSelectedSubcategory(null);
                }
            } else {
                setError(`Failed to fetch quizzes for category "${category}"`);
                setSubcategories([]);
                setSelectedSubcategory(null);
                console.error("Invalid subcategories response:", response);
            }
        } catch (err) {
            setError(`Error fetching quizzes for category "${category}": ${err.message || "Unknown error"}`);
            setSubcategories([]);
            setSelectedSubcategory(null);
            console.error("Error fetching subcategories:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = () => {
        // Reset previous error
        setError("");

        // Validate category selection
        if (!selectedCategory) {
            setError("Please select a category");
            return false;
        }

        // Validate subcategory selection
        if (!selectedSubcategory?.wikidataCode) {
            setError("Please select a valid quiz");
            return false;
        }

        // Validate number of questions
        if (!numberOfQuestions || numberOfQuestions < 1) {
            setError("Please enter at least 1 question");
            return false;
        }
        
        if (numberOfQuestions > 20) {
            setError("No more than 20 questions are allowed");
            return false;
        }

        // Validate number of answers
        if (!numberOfAnswers || numberOfAnswers < 2) {
            setError("Please enter at least 2 answer options");
            return false;
        }
        
        if (numberOfAnswers > 8) {
            setError("The valid range of options is from 2–8");
            return false;
        }

        // Validate time per question
        if (!timePerQuestion || timePerQuestion < 1) {
            setError("Time per question must be at least 1 second");
            return false;
        }
        
        if (timePerQuestion > 120) {
            setError("You can only set a time up to 120 seconds");
            return false;
        }

        return true;
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        
        // Validate form inputs
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        setError("");

        try {
            if (!selectedSubcategory?.wikidataCode) {
                throw new Error("No valid quiz selected");
            }

            console.log("Creating quiz with parameters:", {
                wikidataCode: selectedSubcategory.wikidataCode,
                numberOfQuestions,
                numberOfAnswers
            });

            // Get the quiz data
            const quizResponse = await fetchWithAuth(
                `/game/${selectedSubcategory.wikidataCode}/${numberOfQuestions}/${numberOfAnswers}`
            );

            if (!quizResponse || !Array.isArray(quizResponse) || quizResponse.length === 0) {
                throw new Error("Failed to generate quiz questions. Please try again.");
            }

            // Get user info from token
            const userData = await fetchWithAuth("/token/username");
            if (!userData || !userData._id) {
                throw new Error("Could not retrieve user information. Please log in again.");
            }

            const hostId = userData._id;
            const hostUsername = userData.username;
            
            // Get token from cookies
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("token="))
                ?.split("=")[1];
                
            if (!token) {
                throw new Error("Authentication token not found. Please log in again.");
            }

            // Prepare quiz metadata with time per question
            const quizMetaData = [{
                title: selectedSubcategory.title,
                wikidataCode: selectedSubcategory.wikidataCode,
                difficulty: selectedSubcategory.difficulty,
                timePerQuestion: timePerQuestion,
                category: selectedCategory,
                quizName: selectedSubcategory.title,
                question: selectedSubcategory.question,
            }];

            console.log("Creating session with metadata:", quizMetaData);

            // Create a shared quiz session
            const sessionResponse = await fetch(`${apiEndpoint}/shared-quiz/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    quizData: quizResponse,
                    quizMetaData: quizMetaData,
                    hostId,
                    hostUsername
                })
            });

            if (!sessionResponse.ok) {
                const errorText = await sessionResponse.text();
                throw new Error(`Failed to create shared quiz session: ${errorText}`);
            }

            const sessionData = await sessionResponse.json();
            if (!sessionData || !sessionData.code) {
                throw new Error("Invalid session response from server");
            }

            // Redirect to host manager page
            router.push({ pathname: `/wihoot/host/manager`, query: { code: sessionData.code } });
        } catch (err) {
            setError(err.message || "Failed to create shared quiz");
            console.error("Quiz creation error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box className="create-game-container" sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
            <Card className="create-game-card" sx={{ maxWidth: 600, width: '100%', m: 2, boxShadow: 3 }}>
                <CardHeader
                    className="create-game-header"
                    title={
                        <Typography className="create-game-title" variant="h4" component="h1" align="center">
                            Start a new session
                        </Typography>
                    }
                    subheader={
                        <Typography className="create-game-subheader" variant="body2" color="textSecondary" align="center">
                            Start a session and share your code with your friends to start playing!
                        </Typography>
                    }
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
                <CardContent className="create-game-content">
                    {error && (
                        <Alert className="create-game-error" severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box component="form" className="create-game-form" onSubmit={handleCreateQuiz} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControl fullWidth required>
                            <InputLabel id="category-label">Category</InputLabel>
                            <Select
                                data-testid="category-select"
                                className="create-game-select"
                                labelId="category-label"
                                id="category"
                                value={selectedCategory}
                                label="Category"
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    fetchSubcategories(e.target.value);
                                }}
                                disabled={isLoading || categories.length === 0}
                            >
                                {categories.length === 0 ? (
                                    <MenuItem value="" disabled>Loading categories...</MenuItem>
                                ) : (
                                    categories.map((category) => (
                                        <MenuItem key={category.name} value={category.name}>
                                            {category.name}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth required>
                            <InputLabel id="subcategory-label">Quiz</InputLabel>
                            <Select
                                data-testid="subcategory-select"
                                className="create-game-select"
                                labelId="subcategory-label"
                                id="subcategory"
                                value={selectedSubcategory?.title || ''}
                                label="Quiz"
                                onChange={(e) => {
                                    const selected = subcategories.find(item => item.title === e.target.value);
                                    setSelectedSubcategory(selected || null);
                                }}
                                disabled={isLoading || subcategories.length === 0}
                            >
                                {isLoading ? (
                                    <MenuItem value="" disabled>Loading quizzes...</MenuItem>
                                ) : subcategories.length === 0 ? (
                                    <MenuItem value="" disabled>No quizzes available for this category</MenuItem>
                                ) : (
                                    subcategories.map((quiz) => (
                                        <MenuItem key={quiz.wikidataCode} value={quiz.title}>
                                            {quiz.title}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>

                        <TextField
                            data-testid="questions-input"
                            className="create-game-textfield"
                            id="questions"
                            label="Number of Questions"
                            type="number"
                            inputProps={{ min: 1, max: 20 }}
                            value={numberOfQuestions}
                            onChange={(e) => setNumberOfQuestions(Number(e.target.value) || '')}
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
                            inputProps={{ min: 2, max: 8 }}
                            value={numberOfAnswers}
                            onChange={(e) => setNumberOfAnswers(Number(e.target.value) || '')}
                            fullWidth
                            disabled={isLoading}
                            required
                        />

                        <TextField
                            data-testid="time-input"
                            className="create-game-textfield"
                            id="time-per-question"
                            label="Time Per Question (seconds)"
                            type="number"
                            inputProps={{ min: 1, max: 120 }}
                            value={timePerQuestion}
                            onChange={(e) => setTimePerQuestion(Number(e.target.value) || '')}
                            fullWidth
                            disabled={isLoading}
                            required
                        />

                        <Button
                            data-testid="create-quiz-button"
                            className="create-game-button"
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={isLoading}
                            sx={{ mt: 2, py: 1.5 }}
                        >
                            {isLoading ? (
                                <>
                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                    Creating...
                                </>
                            ) : (
                                "Create Shared Quiz"
                            )}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
