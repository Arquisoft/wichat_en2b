import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Card, Grid, CardContent, Typography, Paper, CircularProgress } from "@mui/material";
import "../../../styles/home/StatisticsCard.css";

const gatewayService = process.env.GATEWAY_SERVICE_URL || "http://localhost:8000";

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
				const token = document.cookie
					.split("; ")
					.find((row) => row.startsWith("token="))
					?.split("=")[1];

				if (!token) {
					throw new Error('No authentication token found');
				}

				const [statsResponse, rankResponse] = await Promise.all([
					fetch(`${gatewayService}/statistics/global`, {
						headers: {
							'Authorization': `Bearer ${token}`,
							'Content-Type': 'application/json'
						}
					}),
					fetch(`${gatewayService}/leaderboard`, {
						headers: {
							'Authorization': `Bearer ${token}`,
							'Content-Type': 'application/json'
						}
					})
				]);

				if (!statsResponse.ok || !rankResponse.ok) {
					throw new Error('Failed to fetch data');
				}

				const statsData = await statsResponse.json();
				const rankData = await rankResponse.json();

				setStatistics(statsData.stats);
				setRank(rankData.rank);
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
	if (loading) return <CircularProgress />;
	if (error) return <Typography color="error">{error}</Typography>;
	if (!statistics) return null;
	return (
		<Card className="stats-card">
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
