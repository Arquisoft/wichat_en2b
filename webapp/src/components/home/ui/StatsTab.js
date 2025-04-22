"use client"

import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import {
	Card,
	CardHeader,
	CardContent,
	Typography,
	Grid,
	Paper,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Box,
} from "@mui/material"
import "../../../styles/home/StatsTab.css"
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import LoadingErrorHandler from ".//LoadingErrorHandler";
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

// TabPanel component for the tabs
function TabPanel(props) {
	const { children, value, index, ...other } = props

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`stats-tabpanel-${index}`}
			aria-labelledby={`stats-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	)
}

TabPanel.propTypes = {
	children: PropTypes.node,
	index: PropTypes.number.isRequired,
	value: PropTypes.number.isRequired,
}

/**
 * Displays statistics for quizzes.
 *
 * @returns {JSX.Element} Rendered StatsTab component.
 */
export default function StatsTab() {
	const [statistics, setStatistics] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [selectedSubject, setSelectedSubject] = useState("all")
	const [categories, setCategories] = useState([]);

	const isDesktop = window.innerWidth >= 960

	useEffect(() => {
		const fetchStatistics = async () => {
			setLoading(true);
			setError(null);
			try {
				const endpoint = selectedSubject === "all"
					? "/statistics/global"
					: `/statistics/subject/${selectedSubject.toLowerCase()}`
				const data = await fetchWithAuth(endpoint);
				if (!data || !data.stats) {//NOSONAR
					setError("You have not played any quizzes on this category yet.");
					setStatistics(null);
				}
				setStatistics(data.stats);
			} catch (error) {
				console.error("Error fetching statistics:", error);
				setError("Failed to fetch statistics. Please try again later.");
			} finally {
				setLoading(false);
			}
		}
		fetchStatistics();
	}, [selectedSubject]);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await fetch(`${apiEndpoint}/quiz/allTopics`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				  });
				  const data = await response.json();

				if (Array.isArray(data)) {
					setCategories(data);
				}
			} catch (error) {
				console.error("Failed to fetch categories", error);
			}
		};

		fetchCategories();
	}, []);
	const handleSubjectChange = (event) => {
		setSelectedSubject(event.target.value);
	}

	function StatsPie() {
		if (!statistics || !statistics.totalQuestions)
			return null;
		return (
			<Box sx={{ width: "100%", height: 280 }}>
				<PieChart
					series={[
						{
							data: [
								{
									id: 0,
									value: statistics.totalCorrectAnswers,
									label: 'Correct',
									color: "#178ee4"
								},
								{
									id: 1,
									value: statistics.totalQuestions - statistics.totalCorrectAnswers,
									label: 'Incorrect',
									color: "#e6296f"
								},
							],
							highlightScope: { faded: "global", highlighted: "item" },
							innerRadius: 30,
							outerRadius: 100,
							paddingAngle: 2,
							cornerRadius: 4,
						},
					]}
					slotProps={{
						legend: {
							direction: 'row',
							position: { vertical: 'bottom', horizontal: 'middle' },
							padding: 20,
							itemMarkWidth: 20,
							itemMarkHeight: 20,
							markGap: 8,
							itemGap: 20,
						},
					}}
					margin={{ top: 10, bottom: 70, left: 0, right: 0 }}
					width={400}
					height={280}
				/>
			</Box>
		);
	}

	function StatsArc() {
		if (!statistics || !statistics.totalQuestions)
			return null;
		const accuracy = (statistics.successRatio * 100).toFixed(1)
		const settings = {
			width: 220,
			height: 220,
			value: accuracy,
		}
		let arcColor = "#e6296f" // Red for low accuracy
		if (accuracy >= 70)
			arcColor = "#178ee4" // Blue for high accuracy
		else if (accuracy >= 40) arcColor = "#f5a623" // Yellow for medium accuracy
		return (
			<Box sx={{ display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width: "100%",
				mt: 3,
			}}>
				<Gauge
					{...settings}
					cornerRadius="50%"
					sx={() => ({
						[`& .${gaugeClasses.valueText}`]: {
							fontSize: 40,
							fontWeight: "bold",
						},
						[`& .${gaugeClasses.valueArc}`]: {
							fill: arcColor,
							transition: "fill 0.5s",
						},
						[`& .${gaugeClasses.referenceArc}`]: {
							fill: '#d1dad1',
						},
					})}
					text={
						({ value }) => `${value} %`
					}
				/>
				<Typography variant="body1" sx={{ mt: 1, fontWeight: "medium" }}>
					Accuracy
				</Typography>
			</Box>
		);
	}

	return (
		<Card>
			<CardHeader
				title={
					<Box className={"stats-header"}
						 sx={{
							 display: "flex",
							 justifyContent: "space-between",
							 alignItems: "center",
							 flexWrap: "wrap",
							 gap: 2,
						 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Typography variant="h5" id="title-quiz-statistics" sx={{ fontWeight: "bold" }}>
								Quiz Statistics
							</Typography>
						</Box>
						<Typography
							variant="body2"
							color="textSecondary"
							sx={{
								bgcolor: "background.paper",
								px: 2,
								py: 0.5,
								borderRadius: 4,
								border: "1px solid",
								borderColor: "divider",
							}}
						>
							Based on {statistics ? statistics.totalGames : 0} completed quizzes
						</Typography>
						<FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
							<InputLabel id="subject-select-label">Filter by subject</InputLabel>
							<Select
								labelId="subject-select-label"
								value={selectedSubject}
								onChange={handleSubjectChange}
								label="Filter by subject"
								variant={"outlined"}
								sx={{ borderRadius: 2 }}
							>
								<MenuItem value="all">All Subjects</MenuItem>
								{categories.map((category) => (
									<MenuItem key={category} value={category}>
										{category}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Box>
				}
				sx={{
					borderBottom: "1px solid",
					borderColor: "divider",
					pb: 2,
				}}
			/>
			<CardContent>
				<LoadingErrorHandler loading={loading} error={error}>
					{ statistics && (
						<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
							{/* Left side - Statistics Cards */}
							<Box sx={{ flex: 1, order: { xs: 2, md: 1 } }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
								</Box>
								<Grid container spacing={2}>
									<StatCard id="total-games" title="Total Games" value={statistics.totalGames} />
									<StatCard
										id="avg-score"
										title="Avg Score per Quiz"
										value={`${statistics.avgScore.toFixed(1)} points`}
									/>
									<StatCard id="total-score" title="Total Score" value={`${statistics.totalScore} points`} />
									<StatCard id="total-answ" title="Correct Answers" value={statistics.totalCorrectAnswers} />
									<StatCard id="total-questions" title="Total Questions" value={statistics.totalQuestions} />
									<StatCard id="accuracy" title="Accuracy" value={`${(statistics.successRatio * 100).toFixed(1)}%`} />
									<StatCard id="avg-quiz-time" title="Avg Time per Quiz" value={`${statistics.avgTime.toFixed(1)} s`} />
								</Grid>
							</Box>

							{/* Right side - Charts */}
							<Box sx={{ flex: 1,  order: { xs: 1, md: 2 } }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
								</Box>
								<Paper
									elevation={1}
									sx={{
										p: 2,
										mb: 3,
										borderRadius: 2,
										boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
									}}
								>
									<Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
										Answer Distribution
									</Typography>
									<Box sx={{
										display: 'flex',
										flexDirection: 'row',
										justifyContent: 'center',
										alignItems: 'center',
										gap: 2
									}}>
										<Box sx={{ width: '50%' }}>
											<StatsPie />
										</Box>
										<Box sx={{ width: '50%' }}>
											<StatsArc />
										</Box>
									</Box>
								</Paper>
							</Box>
						</Box>)}
						{/* Recent quizzes table */}
						<Paper
							elevation={1}
							sx={{
							mt: 2,
							borderRadius: 2,
								transition: "all 0.2s",
								"&:hover": {
									transform: "translateY(-3px)",
									boxShadow: 3,
								},
							overflow: 'hidden'
						}}
						>
						<Typography variant="subtitle1" sx={{ p: 2, fontWeight: "bold", borderBottom: 1, borderColor: 'divider' }}>
							Recent Quizzes
						</Typography>
						<TableContainer>
							<Table size="small" aria-label="recent quizzes table">
								<TableHead>
									<TableRow>
										<TableCell>Subject</TableCell>
										<TableCell align="right">Points</TableCell>
										<TableCell align="right">Questions</TableCell>
										<TableCell align="right">Correct</TableCell>
										<TableCell align="right">Wrong</TableCell>
										<TableCell align="right">Time</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									<TableRow>
										<TableCell>Math</TableCell>
										<TableCell align="right">240</TableCell>
										<TableCell align="right">10</TableCell>
										<TableCell align="right">5</TableCell>
										<TableCell align="right">
											5
										</TableCell>
										<TableCell align="right">60 s</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>
					</Paper>
				</LoadingErrorHandler>
			</CardContent>

		</Card>
	)
}

function StatCard({ id, title, value }) {
	return (
		<Grid item xs={12} sm={6}>
			<Paper id={id} elevation={2} sx={{
				p: 2,
				borderRadius: 2,
				transition: "all 0.2s",
				"&:hover": {
					transform: "translateY(-3px)",
					boxShadow: 3,
				},
				height: "100%",
				display: "flex",
				alignItems: "center",
				gap: 2,
			}}>
				<Box>
					<Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
						{value}
					</Typography>
					<Typography variant="body2" color="textSecondary">
						{title}
					</Typography>
				</Box>
			</Paper>
		</Grid>
	)
}

StatCard.propTypes = {
	id: PropTypes.string,
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
}


