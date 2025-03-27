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
	CircularProgress,
	Tabs,
	Tab,
	Box,
} from "@mui/material"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { quizCategories } from "../data"
import "../../../styles/home/StatsTab.css"

const gatewayService = process.env.GATEWAY_SERVICE_URL || "http://localhost:8000";

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
	const [tabValue, setTabValue] = useState(0)

	useEffect(() => {
		const fetchStatistics = async () => {
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
				const endpoint = selectedSubject === "all"
					? "/statistics/global"
					: `/statistics/subject/${selectedSubject.toLowerCase()}`

				const response = await fetch(`${gatewayService}${endpoint}`, {
					headers: {
						'Authorization': `Bearer ${token}`, // review how it is saved
						'Content-Type': 'application/json'
					}
				});

				if (!response.ok) {
					throw new Error('Failed to fetch statistics');
				}
				const data = await response.json();
				console.log(data);
				if (!data || !data.stats) {
					throw new Error('Invalid statistics data');
				}
				setStatistics(data.stats);
			} catch (error) {
				setError(error.message);
				setStatistics(null);
			} finally {
				setLoading(false);
			}
		}
		fetchStatistics();
	}, [selectedSubject]);

	const handleSubjectChange = (event) => {
		setSelectedSubject(event.target.value);
	}

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
	}

	const chartData = statistics
		? [
			{ name: "Success Rate", value: Number.parseFloat(statistics.successRatio.toFixed(1)) },
			{ name: "Avg Score", value: Number.parseFloat(statistics.avgScore.toFixed(1)) },
			{ name: "Avg Time (s)", value: Number.parseFloat(statistics.avgTime.toFixed(1)) }
		]
		: []

	if (error) {
		return (
			<Card>
				<CardContent>
					<Typography color="error">{error}</Typography>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader
				title={
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="h6">Quiz Statistics</Typography>
						<FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
							<InputLabel id="subject-select-label">Filter by subject</InputLabel>
							<Select
								labelId="subject-select-label"
								value={selectedSubject}
								onChange={handleSubjectChange}
								label="Filter by subject"
							>
								<MenuItem value="all">All Subjects</MenuItem>
								{quizCategories.map((category) => (
									<MenuItem key={category.id} value={category.name}>
										{category.icon} {category.name}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Box>
				}
			/>
			<CardContent>
				{loading ? (
					<Box display="flex" justifyContent="center" alignItems="center" height="400px">
						<CircularProgress />
					</Box>
				) : statistics ? (
					<>
						<Box mb={2}>
							<Typography variant="h6">
								{selectedSubject !== "all" ? `${selectedSubject} Statistics` : "Global Statistics"}
							</Typography>
							<Typography variant="body2" color="textSecondary">
								Based on {statistics.totalGames} completed quizzes
							</Typography>
						</Box>

						<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
							<Tabs value={tabValue} onChange={handleTabChange} aria-label="statistics tabs">
								<Tab label="Overview" id="stats-tab-0" aria-controls="stats-tabpanel-0" />
								<Tab label="Detailed Stats" id="stats-tab-1" aria-controls="stats-tabpanel-1" />
							</Tabs>
						</Box>

						<TabPanel value={tabValue} index={0}>
							<Box height="300px" width="100%">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={chartData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="name" />
										<YAxis />
										<Tooltip />
										<Bar
											dataKey="value"
											fill={
												selectedSubject !== "all"
													? quizCategories.find((c) => c.name === selectedSubject)?.color || "#8884d8"
													: "#8884d8"
											}
										/>
									</BarChart>
								</ResponsiveContainer>
							</Box>
						</TabPanel>

						<TabPanel value={tabValue} index={1}>
							<Grid container spacing={2}>
								<StatCard title="Total Games" value={statistics.totalGames} />
								<StatCard title="Avg Score" value={`${statistics.avgScore.toFixed(1)}%`} />
								<StatCard title="Total Score" value={statistics.totalScore} />
								<StatCard title="Correct Answers" value={statistics.totalCorrectAnswers} />
								<StatCard title="Total Questions" value={statistics.totalQuestions} />
								<StatCard title="Success Ratio" value={`${(statistics.successRatio * 100).toFixed(1)}%`} />
								<StatCard title="Avg Time per Quiz" value={`${statistics.avgTime.toFixed(1)}s`} />
							</Grid>
						</TabPanel>
					</>
				) : null}
			</CardContent>
		</Card>
	)
}

function StatCard({ title, value }) {
	return (
		<Grid item xs={12} sm={6} md={4}>
			<Paper elevation={2} sx={{ p: 2 }}>
				<Typography variant="h5" component="div">
					{value}
				</Typography>
				<Typography variant="body2" color="textSecondary">
					{title}
				</Typography>
			</Paper>
		</Grid>
	)
}

StatCard.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

