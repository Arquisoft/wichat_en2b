import PropTypes from "prop-types"
import { Card, CardContent, Grid, Box, Typography, LinearProgress, Paper } from "@mui/material"
import "../../../styles/ProgressCard.css"

const ProgressCard = ({ progress }) => {
  return (
    <Card className="progress-card">
      <CardContent className="progress-content">
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box className="progress-section">
              <Box className="progress-header">
                <Typography className="progress-title">Level Progress</Typography>
                <Typography className="level-indicator">Level 8</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} className="progress-bar" />
              <Typography className="progress-text">{progress}% to Level 9</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Grid container spacing={2} className="stats-container">
              <Grid item xs={4}>
                <Paper className="stat-card stat-quizzes">
                  <Typography className="stat-value">42</Typography>
                  <Typography className="stat-label">Quizzes</Typography>
                </Paper>
              </Grid>

              <Grid item xs={4}>
                <Paper className="stat-card stat-accuracy">
                  <Typography className="stat-value">78%</Typography>
                  <Typography className="stat-label">Accuracy</Typography>
                </Paper>
              </Grid>

              <Grid item xs={4}>
                <Paper className="stat-card stat-rank">
                  <Typography className="stat-value">#12</Typography>
                  <Typography className="stat-label">Rank</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

// Add PropTypes validation
ProgressCard.propTypes = {
  progress: PropTypes.number.isRequired, // Ensure 'progress' is a required number
}

export default ProgressCard

