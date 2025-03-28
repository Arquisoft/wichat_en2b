import PropTypes from "prop-types";
import { Card, Grid, CardContent, Typography, Paper } from "@mui/material";
import "../../../styles/home/StatisticsCard.css";

/**
 * Displays statistics in a card format.
 * 
 * @param {JSON} stats - Contains stats object with quizzes, accuracy, and rank.
 * 
 * @returns {JSX.Element} - Rendered StatisticsCard component.
 */
const StatisticsCard = ({ stats }) => {
	return (
		<Card className="stats-card">
			<CardContent className="stats-content">
				<Grid container spacing={3}>
					{/* Quizzes */}
					<Grid size={{ xs: 12 }}>
						<Grid container spacing={2} className="stats-container">
							<Grid size={{ xs: 12, sm: 4 }}>
								<Paper className="stat-card stat-quizzes">
								<Typography className="stat-value">{stats.quizzes}</Typography>
								<Typography className="stat-label">Quizzes</Typography>
								</Paper>
							</Grid>

							{/* Accuracy (in %) */}
							<Grid size={{ xs: 12, sm: 4 }}>
								<Paper className="stat-card stat-accuracy">
								<Typography className="stat-value">{stats.accuracy}%</Typography>
								<Typography className="stat-label">Accuracy</Typography>
								</Paper>
							</Grid>

							{/* Rank */}
							<Grid size={{ xs: 12, sm: 4 }}>
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
