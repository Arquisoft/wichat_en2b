import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardContent, List, ListItem, ListItemText, Typography } from "@mui/material";

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

