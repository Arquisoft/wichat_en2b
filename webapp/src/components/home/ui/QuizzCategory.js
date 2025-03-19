import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button, Container, Box, Typography, Grid } from "@mui/material";
import Link from "next/link";
import { quizCategories, quizzesByCategory } from "../data";
import "../../../styles/home/Categories.css";

function CategoryComponent() {
    const [category, setCategory] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
      if (id) {
        const foundCategory = quizCategories.find(category => category.id === parseInt(id));
        if (foundCategory) {
          setCategory(foundCategory);
          setQuizzes(quizzesByCategory[id] || []);
        } else {
          console.error(`Category with id ${id} not found`);
          router.push("/404");
        }
      }
    }, [id]);

    if (!category) return <div>Loading...</div>;

    return (
      <Box className="category-container">
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" align="center" className="category-title">
            {category.name} Quizzes
          </Typography>
          <Typography variant="subtitle1" align="center" className="category-description">
            {category.icon} - {category.color}
          </Typography>

          <Link href="/play" passHref>
            <Button className="back-button">Go Back</Button>
          </Link>

          <Grid container spacing={4} className="quizzes-grid">
            {quizzes.map((quiz) => (
              <Grid item xs={12} sm={6} md={4} key={quiz.id} className="quiz-item">
                <Box className="quiz-card">
                  <Typography variant="h6" className="quiz-title">{quiz.title}</Typography>
                  <Typography variant="body2" className="quiz-description">{quiz.description}</Typography>
                  <div className="quiz-buttons">
                    <Button onClick={() => router.push(`/quiz/play/${quiz.id}/easy`)} className="quiz-button">Easy</Button>
                    <Button onClick={() => router.push(`/quiz/play/${quiz.id}/medium`)} className="quiz-button">Medium</Button>
                    <Button onClick={() => router.push(`/quiz/play/${quiz.id}/hard`)} className="quiz-button">Hard</Button>
                  </div>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
}

export default CategoryComponent;
