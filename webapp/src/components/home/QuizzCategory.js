import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import QuestionGame from "../game/QuestionGame"; 
import "../../styles/home/Categories.css";
import "@/app/layout";
import { Button, Container, Grid, Box, Typography, Card, CardContent, CardHeader, Badge } from "@mui/material";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

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
          // Replace inside fetchQuizzes in useEffect
        const fetchQuizzes = async () => {
          try {
            const response = await fetch(`${apiEndpoint}/quiz/${id}`);
            const data = await response.json();

            // Map data to fit frontend expectations
            const mappedQuizzes = data.map((quiz) => ({//NOSONAR
              id: quiz._id,
              title: quiz.quizName,
              description: quiz.description,
              difficulty: mapDifficulty(quiz.difficulty),
              wikidataCode: quiz.wikidataCode,
              questions: quiz.numQuestions,
              options: quiz.numOptions,
              timeEstimate: quiz.timePerQuestion,
              question: quiz.question,
              color: quiz.color,
              category: quiz.category,
            }));

            setQuizzes(mappedQuizzes);
            setCategory({ name: id, color: mappedQuizzes[0]?.color || "#3f51b5" });
            setLoading(false);
          } catch (err) {
            console.log(err);
          }
        };

        // Add this helper to map numeric difficulty to labels
        const mapDifficulty = (level) => {
          switch (level) {
            case 1: return "easy";
            case 2: return "medium";
            case 3: return "hard";
            case 4: return "hard";
            case 5: return "hell";
            default: return "unknown";
          }
        };
        fetchQuizzes();
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
        topic: id, 
        subject: quiz.wikidataCode, 
        totalQuestions: quiz.questions, 
        numberOptions: quiz.options, 
        timerDuration:  quiz.timeEstimate, 
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quiz.id}>

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