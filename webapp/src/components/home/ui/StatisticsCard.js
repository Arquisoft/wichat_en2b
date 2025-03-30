import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Card, Grid, CardContent, Typography, Paper, CircularProgress } from "@mui/material";
import "../../../styles/home/StatisticsCard.css";
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import LoadingErrorHandler from ".//LoadingErrorHandler";
import {getAuthToken, getCurrentPlayerId} from "@/utils/auth";


/**
 * Displays statistics in a card format.
 *
 * 
 * @returns {JSX.Element} - Rendered StatisticsCard component.
 */
const StatisticsCard = () => {
	const [statistics, setStatistics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [rank, setRank] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError(null);

			try {
				const [statsData, rankData] = await Promise.all([
					fetchWithAuth("/statistics/global"),
					fetchWithAuth("/leaderboard")
				]);

				const token = getAuthToken();
				const currentPlayerId = await getCurrentPlayerId(token);
				const playerRank = rankData.leaderboard.find(entry => entry._id === currentPlayerId)?.rank || 'N/A';

				setStatistics(statsData.stats);
				setRank(playerRank);
			} catch (error) {
				setError(error.message);
				setStatistics(null);
				setRank(null);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);
	if (!statistics) return null;
	return (
		<Card className="stats-card">
			<LoadingErrorHandler loading={loading} error={error}>
			<CardContent className="stats-content">
				<Grid container spacing={3}>
					{/* Quizzes */}
					<Grid size={{ xs: 12 }}>
						<Grid container spacing={2} className="stats-container">
							<Grid size={{ xs: 12, sm: 4 }}>
								<Paper className="stat-card stat-quizzes">
								<Typography className="stat-value">{statistics.totalGames}</Typography>
								<Typography className="stat-label">Quizzes</Typography>
								</Paper>
							</Grid>

							{/* Accuracy (in %) */}
							<Grid size={{ xs: 12, sm: 4 }}>
								<Paper className="stat-card stat-accuracy">
								<Typography className="stat-value">{(Number.parseFloat(statistics.successRatio.toFixed(2))*100)}%</Typography>
								<Typography className="stat-label">Accuracy</Typography>
								</Paper>
							</Grid>

							{/* Rank */}
							<Grid size={{ xs: 12, sm: 4 }}>
								<Paper className="stat-card stat-rank">
								<Typography className="stat-value">#{rank}</Typography>
								<Typography className="stat-label">Rank</Typography>
								</Paper>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</CardContent>
			</LoadingErrorHandler>
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
