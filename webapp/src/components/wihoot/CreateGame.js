import { useState } from "react";
import { useRouter } from "next/navigation";
import {quizCategories} from "@/components/home/data";
import { Box, Typography, Button, TextField, Container, Paper, MenuItem, FormControl, InputLabel, Select, Grid, Slider, Divider } from "@mui/material";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function CreateQuiz() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Default quiz data
    const [quizData, setQuizData] = useState({
        subject: "Science",
        numberOfQuestions: 10,
        timePerQuestion: 60,
        numberOfAnswers: 4,
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setQuizData({
            ...quizData,
            [name]: value
        });
    };

    const handleSliderChange = (name) => (event, newValue) => {
        setQuizData({
            ...quizData,
            [name]: newValue
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!quizData.subject.trim()) {
            setError("Select a subject for the quiz");
            return;
        }

        if (quizCategories.find(c => c.name === quizData.subject) === undefined) {
            setError("Invalid subject selected");
            return;
        }

        try {
            setIsLoading(true);

            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("token="))
                ?.split("=")[1];

            if (!token){
                setError("You must be logged in to create a quiz");
                return router.back();
            }

            const response = await fetch(
                `${apiEndpoint}/game/${quizData.subject}/${quizData.numberOfQuestions}/${quizData.numberOfAnswers}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error when creating the quiz");
            }

            const questionsList = await response.json();

            // Route the user to the play page
            router.push({
                pathname: "/wihoot/play",
                query: {
                    questions: questionsList,
                    time: quizData.timePerQuestion
                }
            });

        } catch (error) {
            console.error("Error al crear el quiz:", error);
            setError(error.message || "Ocurrió un error al crear el quiz");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ my: 4 }}>
                <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                    <Typography variant="h4" component="h1" gutterBottom align="center">
                        Create a New Quiz
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Box component="form" onSubmit={handleSubmit}>
                        <Grid container spacing={4}>
                            {/* Quiz Subject */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    id="subject"
                                    name="subject"
                                    label="Quiz subject"
                                    placeholder="Science, History, ..."
                                    value={quizData.subject}
                                    onChange={handleInputChange}
                                    variant="outlined"
                                    disabled={isLoading}
                                />
                            </Grid>

                            {/* question number */}
                            <Grid item xs={12} sm={6}>
                                <Typography id="questions-slider-label" gutterBottom>
                                    Number of questions: {quizData.numberOfQuestions}
                                </Typography>
                                <Slider
                                    aria-labelledby="questions-slider-label"
                                    value={quizData.numberOfQuestions}
                                    onChange={handleSliderChange("numberOfQuestions")}
                                    step={1}
                                    marks
                                    min={1}
                                    max={20}
                                    valueLabelDisplay="auto"
                                    disabled={isLoading}
                                />
                            </Grid>

                            {/* question time */}
                            <Grid item xs={12} sm={6}>
                                <Typography id="time-slider-label" gutterBottom>
                                    Time/question: {quizData.timePerQuestion} seconds
                                </Typography>
                                <Slider
                                    aria-labelledby="time-slider-label"
                                    value={quizData.timePerQuestion}
                                    onChange={handleSliderChange("timePerQuestion")}
                                    step={5}
                                    marks
                                    min={10}
                                    max={120}
                                    valueLabelDisplay="auto"
                                    disabled={isLoading}
                                />
                            </Grid>

                            {/* answers number */}
                            <Grid item xs={12}>
                                <FormControl fullWidth disabled={isLoading}>
                                    <InputLabel id="number-of-answers-label">Number of answers per question</InputLabel>
                                    <Select
                                        labelId="number-of-answers-label"
                                        id="numberOfAnswers"
                                        name="numberOfAnswers"
                                        value={quizData.numberOfAnswers}
                                        label="Answers per question"
                                        onChange={handleInputChange}
                                    >
                                        <MenuItem value={4}>4 answers</MenuItem>
                                        <MenuItem value={5}>5 answers</MenuItem>
                                        <MenuItem value={6}>6 answers</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* error msg */}
                            {error && (
                                <Grid item xs={12}>
                                    <Typography color="error" variant="body2">
                                        {error}
                                    </Typography>
                                </Grid>
                            )}

                            {/* buttons */}
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => router.back()}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Creating..." : "Create Quiz"}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
}