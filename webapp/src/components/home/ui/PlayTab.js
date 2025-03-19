import React from "react";
import { Grid, Card, CardHeader, CardContent, Typography, Button } from "@mui/material";
import { quizCategories } from "../data";
import Link from "next/link";
import "../../../styles/home/PlayTab.css";

function PlayTab() {
  return (
    <Grid container spacing={3} className="categories-container">
      {quizCategories.map((category) => (
        <Grid item key={category.id} xs={12} sm={6} md={4}>
          <Card className="category-card">
            <CardHeader
              title={
                <>
                  <span className="category-icon">{category.icon}</span>
                  {category.name}
                </>
              }
              className="category-header"
              sx={{ bgcolor: category.color, color: "white" }}
            />
            <CardContent className="category-content">
              <Typography className="quiz-count">{category.quizCount} quizzes available</Typography>
              <Link href={`/quiz/category/${category.id}`} passHref>
                <Button
                  variant="text"
                  fullWidth
                  className={`start-button button-${category.name.toLowerCase()}`}
                >
                  Enter Category
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default PlayTab;
