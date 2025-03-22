import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardContent, List, ListItem, ListItemText, Typography } from "@mui/material";
import "../../../styles/home/StatsTab.css"; 

/**
 * Displays a list of recent quizzes.
 *
 * @param {Array} recentQuizzes - Array of recent quiz objects.
 * 
 * @returns {JSX.Element} Rendered StatsTab component.
 */
export default function StatsTab({ recentQuizzes }) {
  return (
    <Card>
      <CardHeader title="Recent Quizzes" />

      <CardContent>
        <List>
          {recentQuizzes.map((quiz) => (
            <ListItem key={quiz.id}>
              <ListItemText primary={quiz.title} secondary={quiz.date} />
              <Typography>{quiz.score}/{quiz.total}</Typography>
            </ListItem>
          ))}
        </List>
      </CardContent>

    </Card>
  );
};

// Prop types for StatsTab component
StatsTab.propTypes = {
  recentQuizzes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      score: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired,
    })
  ).isRequired,
};

