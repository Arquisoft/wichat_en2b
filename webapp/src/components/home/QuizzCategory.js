import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Clock } from "lucide-react";
import { quizzesByCategory, quizCategories } from "./data"; 
import Link from "next/link";
import QuestionGame from "../game/QuestionGame"; 
import "../../styles/home/Categories.css";
import "@/app/layout";

import { 
    Button, Container, Box, Typography, Grid, Card, CardContent, CardHeader, Badge 
} from "@mui/material";

/**
 * Renders the quiz categories and handles quiz selection.
 * 
 * @returns {JSX.Element} The rendered component.
 */
function CategoryComponent() {
    const [quizzes, setQuizzes] = useState([]);
    const [category, setCategory] = useState(null);
    const [difficulty] = useState("easy");
    const [showQuiz, setShowQuiz] = useState(false);  
    const [quizData, setQuizData] = useState(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
      if (!id) return;
      setLoading(true);

      const timer = setTimeout(() => {
          const selectedCategory = quizCategories.find(category => category.id === parseInt(id));
          setCategory(selectedCategory || null);

          // Get all quizzes for the selected category
          const selectedQuizzes = quizzesByCategory[id] || [];
          setQuizzes(selectedQuizzes);

          // Set loading to false after 200ms
          setLoading(false);
      }, 200);

      return () => clearTimeout(timer); // Clear the timeout
    }, [id, difficulty]); 

    if (loading) {
      return (
          <Box className="loading-container">
              <Box className="loading-spinner" />
              <Typography variant="h5">Loading...</Typography>
          </Box>
      );
    }

    if(quizzes.length <= 0 || !category) {
      return (
          <Box className="no-quizzes-container">
              <Card sx={{ maxWidth: 500 }}>
                  <CardHeader title="No quizzes available for this category." />

                  <CardContent>
                    <Typography>You should try another one!</Typography>
                  </CardContent>

                  <CardContent>
                    <Link href="/">
                      <Button variant="contained">Back to Dashboard</Button>
                    </Link>
                  </CardContent>
              </Card>
          </Box>
      );
    } 

    const badgeColor = (difficulty) => {
      if (difficulty === "easy") return "success";    // Verde 
      if (difficulty === "medium") return "warning";  // Amarillo 
      if (difficulty === "hard") return "error";      // Rojo 
      if (difficulty === "hell") return "error";      // Rojo 
      return "default";                               
    };

    const handleStartQuiz = (quiz) => {
      setQuizData({
        topic: quiz.wikidataCode, 
        totalQuestions: quiz.questions,
        numberOptions: quiz.options,  
        timerDuration: quiz.timeEstimate,
        question: quiz.question,  
      });

      setShowQuiz(true);  
    };

    if (showQuiz) {
      return <QuestionGame {...quizData} />; 
    }
    
    return (
      <Box className="main-container">

        {/* Header */}
        <Box component="header" className="category-header" 
              style={{ backgroundColor: category.color || '#3f51b5' }}>

          <Container maxWidth="lg">
            <Button
              component={Link}
              href="/"
              variant="text"
              className="back-button"
              startIcon={<ArrowLeft className="back-button-icon" />}
              sx = {{ color: 'white' }}
            >
              Back to Dashboard
            </Button>

            <Box className="header-content">
              <Typography variant="h4" className="icon">{category.icon}</Typography>
              
              <Box className="text-content">
                <Typography variant="h3" className="category-title">
                  {category.name} 
                </Typography>

                <Typography variant="body1" className="category-description">
                  {category.description}
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Main Content */}
        <Box className="main-content">
          <Container maxWidth="lg">

            <Grid container spacing={4}>
              {/* Render all quizzes for the selected category */}
              {quizzes.map((quiz) => (
                <Grid item xs={12} sm={6} md={4} key={quiz.id}>

                  <Card className="quiz-card">
                    {/* Quiz Card Header */}
                    <CardHeader
                      action={
                        <Badge
                          className="badgeDifficulty"
                          badgeContent={quiz.difficulty}
                          color={badgeColor(quiz.difficulty)}
                        />
                      }
                      title={quiz.title}
                    />

                    {/* Quiz Card Content */}
                    <CardContent>
                      <Typography variant="body2">{quiz.description}</Typography>

                      <Box className="quiz-details">
                        <Box className="quiz-time">
                          <Clock className="quiz-icon" /> {quiz.timeEstimate} seconds
                        </Box>

                        <Box>{quiz.questions} questions</Box>
                      </Box>
                    </CardContent>

                    {/* Quiz Card Footer */}
                    <Box className="quiz-button">
                      <Button
                        variant="contained"
                        className="start-quiz-button"
                        onClick={() => handleStartQuiz(quiz)}
                      >
                        Start Quiz
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
    );
}

export default CategoryComponent;