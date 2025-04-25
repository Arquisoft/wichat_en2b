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
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Button,
	Chip,
	Avatar,
	Tooltip,
	IconButton,
} from "@mui/material"
import "../../../styles/home/StatsTab.css"
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import LoadingErrorHandler from ".//LoadingErrorHandler";
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { Info, AccessTime } from "@mui/icons-material"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

const performanceColor = (value) => {
	if (value >= 70) return "#4caf50";
	else if (value >= 40) return "#f5a623";
	else return "#e6296f";
}

const performanceIcon = (value) => {
	if (value >= 70) return ":)";
	else if (value >= 40) return ":|";
	else return ":(";
}

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
	const [recentQuizzes, setRecentQuizzes] = useState([]);
	const [page, setPage] = useState(0);
	const [hasMoreQuizzes, setHasMoreQuizzes] = useState(true);

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

	const fetchRecentQuizzes = async (pageNum) => {
		try {
			const data = await fetchWithAuth(`/statistics/recent-quizzes?page=${pageNum}`);
			if (pageNum === 0) {
				setRecentQuizzes(data.recentQuizzes);
			} else {
				setRecentQuizzes(prevQuizzes => {
					const allQuizzes = [...prevQuizzes, ...data.recentQuizzes];
					const uniqueQuizzes = Array.from(new Map( // avoid duplicates
						allQuizzes.map(quiz => [
							`${quiz._id}`,
							quiz
						])
					).values());
					return uniqueQuizzes;
				});
			}
			setHasMoreQuizzes(data.hasMoreQuizzes);
		} catch (error) {
			console.error("Error fetching recent quizzes:", error);
		}
	};

	useEffect(() => {
		fetchRecentQuizzes(page);
	}, [page]);

	const handleSubjectChange = (event) => {
		setSelectedSubject(event.target.value);
	}

	function StatsPie() {
		if (!statistics || !statistics.totalQuestions)
			return null;

		return (
			<Box sx={{
				width: "100%",
				height: 280,
				display: "flex",
				justifyContent: "center",
			}}>
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
							padding: 0,
							itemMarkWidth: 20,
							itemMarkHeight: 20,
							markGap: 8,
							itemGap: 20,
						},
					}}
					margin={{ top: 10, bottom: 70, left: 0, right: 0 }}
					width={280}
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
		let arcColor = performanceColor(accuracy);
		return (
			<Box sx={{ display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width: "100%",
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
					Overall Accuracy
				</Typography>
			</Box>
		);
	}

	function QuizTable() {
		return (
			<Paper
				elevation={3}
				sx={{
					borderRadius: 2,
					overflow: "hidden",
					mx: "auto",
					boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
				}}
			>
				<Box
					sx={{
						p: 2,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderBottom: "1px solid rgba(0,0,0,0.1)",
						bgcolor: "#f5f7fa",
					}}
				>
					<Typography variant="h6" fontWeight="bold">
						Recent Quizzes
					</Typography>
					<Tooltip title="View your recent quiz performance">
						<IconButton size="small">
							<Info />
						</IconButton>
					</Tooltip>
				</Box>

				<TableContainer sx={{ maxHeight: 400 }}>
					<Table size="medium" aria-label="recent quizzes table" stickyHeader>
						<TableHead>
							<TableRow>
								<TableCell
									align="center"
									sx={{
										bgcolor: "#178ee4",
										color: "white",
										fontWeight: "bold",
										fontSize: "0.95rem",
										borderBottom: "3px solid #1565c0",
									}}
								>
									Subject
								</TableCell>
								<TableCell
									align="center"
									sx={{
										bgcolor: "#178ee4",
										color: "white",
										fontWeight: "bold",
										fontSize: "0.95rem",
										borderBottom: "3px solid #1565c0",
									}}
								>
									Points
								</TableCell>
								<TableCell
									align="center"
									sx={{
										bgcolor: "#178ee4",
										color: "white",
										fontWeight: "bold",
										fontSize: "0.95rem",
										borderBottom: "3px solid #1565c0",
									}}
								>
									Questions
								</TableCell>
								<TableCell
									align="center"
									sx={{
										bgcolor: "#178ee4",
										color: "white",
										fontWeight: "bold",
										fontSize: "0.95rem",
										borderBottom: "3px solid #1565c0",
									}}
								>
									Correct
								</TableCell>
								<TableCell
									align="center"
									sx={{
										bgcolor: "#178ee4",
										color: "white",
										fontWeight: "bold",
										fontSize: "0.95rem",
										borderBottom: "3px solid #1565c0",
									}}
								>
									Wrong
								</TableCell>
								<TableCell
									align="center"
									sx={{
										bgcolor: "#178ee4",
										color: "white",
										fontWeight: "bold",
										fontSize: "0.95rem",
										borderBottom: "3px solid #1565c0",
									}}
								>
									Time
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{recentQuizzes.map((quiz, index) => {
								const scoreColor = performanceColor((quiz.number_correct_answers/quiz.number_of_questions)*100);
								const wrongAnswers = quiz.number_of_questions - quiz.number_correct_answers
								const scoreIcon = performanceIcon((quiz.number_correct_answers/quiz.number_of_questions)*100);
								return (
									<TableRow
										key={index}
										sx={{
											"&:nth-of-type(odd)": { bgcolor: "rgba(0, 0, 0, 0.02)" },
											"&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
											transition: "background-color 0.2s",
											borderLeft: `4px solid ${scoreColor}`,
										}}
									>
										<TableCell
											sx={{
												fontWeight: "bold",
												display: "flex",
												alignItems: "center",
												gap: 1,
											}}
										align="center">
											<Avatar
												sx={{
													width: 32,
													height: 32,
													bgcolor: scoreColor,
													fontSize: "0.875rem",
												}}
											>
												{scoreIcon}
											</Avatar>
											{quiz.subject}
										</TableCell>
										<TableCell align="center">
											<Chip
												label={quiz.points_gain}
												size="small"
												sx={{
													fontWeight: "bold",
													bgcolor: "#e3f2fd",
													color: "#1565c0",
												}}
											/>
										</TableCell>
										<TableCell align="center">{quiz.number_of_questions}</TableCell>
										<TableCell align="center">
											<Box
												sx={{
													color: "#4caf50",
													fontWeight: "medium",
													display: "inline-flex",
													alignItems: "center",
													gap: 0.5,
												}}
											>
												{quiz.number_correct_answers}
											</Box>
										</TableCell>
										<TableCell align="center">
											<Box
												sx={{
													color: wrongAnswers > 0 ? "#f44336" : "#4caf50",
													fontWeight: "medium",
													display: "inline-flex",
													alignItems: "center",
													gap: 0.5,
												}}
											>
												{wrongAnswers}
											</Box>
										</TableCell>
										<TableCell align="center">
											<Box
												sx={{
													display: "inline-flex",
													alignItems: "center",
													gap: 0.5,
												}}
											>
												<AccessTime fontSize="small" color="action" />
												{`${quiz.total_time.toFixed(1)}s`}
											</Box>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</TableContainer>

				<Box
					sx={{
						p: 2,
						display: "flex",
						justifyContent: "space-between",
						borderTop: "1px solid rgba(0,0,0,0.1)",
						bgcolor: "#f5f7fa",
					}}
				>
					<Typography variant="body2" color="text.secondary">
						Showing {recentQuizzes.length} recent quizzes
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Average score:{" "}
						{Math.round(
							recentQuizzes.reduce(
								(acc, quiz) => acc + quiz.points_gain,
								0,
							) / recentQuizzes.length,
						)}
					</Typography>
				</Box>
			</Paper>
		)
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
										flexDirection: { xs: "column", sm: "row" },
										justifyContent: 'center',
										alignItems: 'center',
										gap: { xs: 4, sm: 2 },
									}} className="stat-charts-container stats-charts">
										<Box sx={{
											width: { xs: "100%", sm: "50%" },
											display: "flex",
											justifyContent: "center",
										}}>
											<StatsPie />
										</Box>
										<Box sx={{
											width: { xs: "100%", sm: "50%" },
											display: "flex",
											justifyContent: "center",
										}}>
											<StatsArc />
										</Box>
									</Box>
								</Paper>
							</Box>
						</Box>)}
						{/* Recent quizzes table */}
						<QuizTable/>
							{hasMoreQuizzes && (
								<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
									<Button
										variant="outlined"
										onClick={() => {
											const nextPage = page + 1;
											setPage(nextPage);
											fetchRecentQuizzes(nextPage);
										}}
										disabled={loading}
									>
										{loading ? 'Loading...' : 'Load more'}
									</Button>
								</Box>
							)}
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


