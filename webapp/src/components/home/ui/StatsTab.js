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
import { quizCategories } from "../data"
import "../../../styles/home/StatsTab.css"
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import LoadingErrorHandler from ".//LoadingErrorHandler";

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
	
	useEffect(() => {
		const fetchStatistics = async () => {
			setLoading(true);
			setError(null);
			try {
				const endpoint = selectedSubject === "all"
					? "/statistics/global"
					: `/statistics/subject/${selectedSubject.toLowerCase()}`
				const data = await fetchWithAuth(endpoint);
				if (!data || !data.stats) {
					setError("You have not played any quizzes on this category yet.");
					setStatistics(null);
				}
				setStatistics(data.stats);
			} catch (error) {
			} finally {
				setLoading(false);
			}
		}
		fetchStatistics();
	}, [selectedSubject]);

	const handleSubjectChange = (event) => {
		setSelectedSubject(event.target.value);
	}

	return (
		<Card>
			<CardHeader
				title={
					<Box className={"stats-header"} display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="h5">Quiz Statistics</Typography>
						<Typography variant="body2" color="textSecondary">
							Based on {statistics ? statistics.totalGames : 0} completed quizzes
						</Typography>
						<FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
							<InputLabel id="subject-select-label">Filter by subject</InputLabel>
							<Select
								labelId="subject-select-label"
								value={selectedSubject}
								onChange={handleSubjectChange}
								label="Filter by subject"
							 variant={"outlined"}>
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
				<LoadingErrorHandler loading={loading} error={error}>
				{ statistics && (
					<>
						<Grid container spacing={2} className={"detailed-stats"}>
							<StatCard title="Total Games" value={statistics.totalGames} />
							<StatCard title="Avg Score per Quiz" value={`${statistics.avgScore} points`} />
							<StatCard title="Total Score" value={`${statistics.totalScore} points`} />
							<StatCard title="Correct Answers" value={statistics.totalCorrectAnswers} />
							<StatCard title="Total Questions" value={statistics.totalQuestions} />
							<StatCard title="Accuracy" value={`${(statistics.successRatio * 100).toFixed(1)}%`} />
							<StatCard title="Avg Time per Quiz" value={`${statistics.avgTime.toFixed(1)} s`} />
						</Grid>
					</>
				)}
			</LoadingErrorHandler>
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


