import React from "react";
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
}
