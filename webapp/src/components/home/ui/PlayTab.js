import React from "react";
import { Grid, Card, CardHeader, CardContent, Typography, Button } from "@mui/material";
import { quizCategories } from "../data";
import "../../../styles/PlayTab.css";

function PlayTab() {
  // Function to get button class based on category name
  const getButtonClass = (categoryName) => {
    const name = categoryName.toLowerCase();
    return `start-button button-${name}`;
  };

  return React.createElement(
    Grid,
    { container: true, spacing: 3, className: "categories-container" },
    quizCategories.map((category) =>
      React.createElement(
        Grid,
        { item: true, key: category.id, xs: 12, sm: 6, md: 4 },
        React.createElement(
          Card,
          { className: "category-card" },
          React.createElement(CardHeader, {
            title: React.createElement(
              Typography,
              { className: "category-title" },
              React.createElement("span", { className: "category-icon" }, category.icon),
              category.name
            ),
            className: "category-header",
            sx: { bgcolor: category.color, color: "white" }
          }),
          React.createElement(
            CardContent,
            { className: "category-content" },
            React.createElement(Typography, { className: "quiz-count" }, `${category.quizCount} quizzes available`),
            React.createElement(
              Button,
              { variant: "text", fullWidth: true, className: getButtonClass(category.name) },
              "Start Quiz"
            )
          )
        )
      )
    )
  );
}

export default PlayTab;