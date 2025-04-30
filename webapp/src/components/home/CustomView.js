"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import QuestionGame from "../game/QuestionGame"
import "../../styles/home/CustomView.css"

import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from "@mui/material"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

function CustomQuiz() {
    const router = useRouter();
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [subcategories, setSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState("");
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [numberOfQuestions, setNumberOfQuestions] = useState(10);
    const [numberOfOptions, setNumberOfOptions] = useState(4);
    const [showGame, setShowGame] = useState(false);
    const [quizData, setQuizData] = useState([]);
    const [error, setError] = useState(null);
    const [numberOfAvailableQuestions, setNumberOfAvailableQuestions] = useState(10);
    const [HomeURL, setHomeURL] = useState("/");

    const fetchSubcategories = async (cat) => {
      try {
        const response = await fetch(`${apiEndpoint}/quiz`);
        const data = await response.json();

        const formattedCategories = Object.values(
          data.reduce((acc, quiz) => {
            const category = quiz.category;
            acc[category] = {
              name: category,
            };
            return acc;
          }, {})
        );

        setSubcategories(mappedQuizzes);
        setSelectedSubcategory(mappedQuizzes[0]);
        fetchAvailableQuestions(mappedQuizzes[0].wikidataCode);
      } catch (err) {
        setError("There was an error fetching the quizzes.");
      }
    };

    const fetchAvailableQuestions = async (wikidataCode) => {
      try{
        const response = await fetch(`${apiEndpoint}/question/amount/${wikidataCode}`);
        const data = await response.json();
        setNumberOfAvailableQuestions(data);
      } catch (error){
        setError("There was an error fetching the amount of questions we have");
      }
    };
    setQuizData(quizData);
    setShowGame(true);
  }

    const validFields = () => {
      let tempError = null;
      if (numberOfQuestions <= 0) {
        tempError = "You cannot enter a negative amount of questions.";
      } else if (numberOfQuestions > 30) {
        tempError = "No more than 30 questions are allowed";
      } else if (numberOfQuestions > numberOfAvailableQuestions) {
        tempError = `There are only ${numberOfAvailableQuestions} questions for this quiz.`;
      } else if (numberOfOptions < 2 || numberOfOptions > 8) {
        tempError = "The valid range of options is from 2–8.";
      } else if (timePerQuestion < 1 || timePerQuestion > 120) {
        tempError = "You can only set a time from 1–120 seconds.";
      }
    
      setError(tempError);
      return tempError == null;
    };
    

    useEffect(() => {
        const fetchCategories = async () => {
          try {
            const response = await fetch(`${apiEndpoint}/quiz`);
            const data = await response.json();

            const formattedCategories = Object.values(
              data.reduce((acc, quiz) => {
                const category = quiz.category;
                acc[category] = {
                  name: category,
                };
                return acc;
              }, {})
            );
    
            setCategories(formattedCategories);
            setSelectedCategory(formattedCategories[0].name);
            await fetchSubcategories(formattedCategories[0].name);
          } catch (error) {
            setError("There was an error fetching the categories");
          }
        };

        const computeHomeURL = async () => {
          const id = getCurrentPlayerId(getAuthToken());
          setHomeURL(!id? "/guest/home": "/");
        };
    
        fetchCategories();
        computeHomeURL();
    }, []); 
  
  return (
    <Box className="custom-quiz-container" sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f5f5f5' }}>
      <Card className="custom-quiz-card" sx={{ maxWidth: 600, width: '100%', m: 2, boxShadow: 3 }}>
        <CardHeader
          className="custom-quiz-header"
          title={<Typography className="custom-quiz-title" variant="h4" component="h1" align="center">Customize your quiz!</Typography>}
          subheader={<Typography className="custom-quiz-subheader" variant="body2" color="textSecondary" align="center">
            Configure your own custom quiz experience.
          </Typography>}
        />
        <CardContent className="custom-quiz-content">
          {error && (
            <Alert className="custom-quiz-error" severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" className="custom-quiz-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="category-select-label">Select Category</InputLabel>
              <Select
                labelId="category-select-label"
                id="category-select"
                value={selectedCategory || ''}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  fetchSubcategories(e.target.value);
                }}
                label="Select Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.name} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel id="quiz-select-label">Select Quiz</InputLabel>
              <Select
                labelId="quiz-select-label"
                id="quiz-select"
                value={selectedSubcategory.title || ''}
                onChange={(e) => {
                  const s = subcategories.find(element => element.title === e.target.value);
                  setSelectedSubcategory(s);
                  fetchAvailableQuestions(s.wikidataCode);
                }}
                label="Select Quiz"
              >
                {subcategories.map((quiz) => (
                  <MenuItem key={quiz.wikidataCode} value={quiz.title}>
                    {quiz.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              id="time-per-question"
              label="Time Per Question (seconds)"
              type="number"
              variant="outlined"
              slotProps={{ input: { min: 1, max: 120 } }}
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number.parseInt(e.target.value))}
            />

            <TextField
              fullWidth
              id="number-of-questions"
              label="Number of Questions"
              type="number"
              variant="outlined"
              slotProps={{ input: { min: 1, max: 30 } }}
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(Number.parseInt(e.target.value))}
              helperText={`Available questions: ${numberOfAvailableQuestions}`}
            />

            <TextField
              fullWidth
              id="number-of-answers"
              label="Number of Options Per Question"
              type="number"
              variant="outlined"
              slotProps={{ input: { min: 2, max: 8 } }}
              value={numberOfOptions}
              onChange={(e) => setNumberOfOptions(Number.parseInt(e.target.value))}
            />

            <Button 
              className="custom-quiz-button"
              type="submit" 
              variant="contained" 
              color="primary"
              sx={{ py: 1.5 }}
            >
              Start Quiz
            </Button>

            <Button
              className="back-button"
              variant="outlined"
              color="secondary"
              onClick={() => router.push("/")}
            >
              Go Back
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default CustomQuiz;