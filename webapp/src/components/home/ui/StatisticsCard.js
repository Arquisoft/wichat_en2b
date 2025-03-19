import PropTypes from "prop-types";
import { Card, CardContent, Grid, Typography, Paper } from "@mui/material";
import "../../../styles/home/StatisticsCard.css";

const StatisticsCard = ({ stats }) => {
  return (
    <Card className="stats-card">
      <CardContent className="stats-content">
        <Grid container spacing={3}>
          {/* Eliminamos la sección con los títulos innecesarios */}
          <Grid item xs={12}>
            <Grid container spacing={2} className="stats-container">
              <Grid item xs={12} sm={4}>
                <Paper className="stat-card stat-quizzes">
                  <Typography className="stat-value">{stats.quizzes}</Typography>
                  <Typography className="stat-label">Quizzes</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper className="stat-card stat-accuracy">
                  <Typography className="stat-value">{stats.accuracy}%</Typography>
                  <Typography className="stat-label">Accuracy</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper className="stat-card stat-rank">
                  <Typography className="stat-value">#{stats.rank}</Typography>
                  <Typography className="stat-label">Rank</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Add PropTypes validation
StatisticsCard.propTypes = {
  stats: PropTypes.shape({
    quizzes: PropTypes.number.isRequired,
    accuracy: PropTypes.number.isRequired,
    rank: PropTypes.number.isRequired,
  }).isRequired, // Ensure 'stats' contains quizzes, accuracy, and rank as numbers
};

export default StatisticsCard;
