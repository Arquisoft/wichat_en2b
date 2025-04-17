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
	Box
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
				console.log("Fetched categories:", data);
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
			<Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
			<PieChart
				series={[
					{
						data: [
							{
								id: 0,
								value: statistics.totalCorrectAnswers,
								label: 'Correct',
								color: "#5ca8f1"
							},
							{
								id: 1,
								value: statistics.totalQuestions - statistics.totalCorrectAnswers,
								label: 'Incorrect',
								color: "#e6296f"
							},
						],
						highlightScope: { faded: 'global', highlighted: 'item' },
					},
				]}
				slotProps={{
					legend: {
						direction: 'row',
						position: { vertical: 'bottom', horizontal: 'middle' },
						padding: 20
					},
				}}
				margin={{ top: 10, bottom: 70, left: 0, right: 0 }}
				width={400}
				height={300}
			/>
			</Box>
		);
	}

	function StatsArc() {
		if (!statistics || !statistics.totalQuestions)
			return null;
		const settings = {
			width: 200,
			height: 200,
			value: (statistics.successRatio * 100).toFixed(1),
		};
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
			<Gauge
				{...settings}
				cornerRadius="50%"
				sx={(theme) => ({
					[`& .${gaugeClasses.valueText}`]: {
						fontSize: 40,
					},
					[`& .${gaugeClasses.valueArc}`]: {
						fill: '#af33c3',
					},
					[`& .${gaugeClasses.referenceArc}`]: {
						fill: theme.palette.text.disabled,
					},
				})}
				text={
					({ value }) => `${value} %`
				}
			/>
			</Box>
		);
	}

	return (
		<Card>
			<CardHeader
				title={
					<Box className={"stats-header"} display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="h5" id='title-quiz-statistics'>Quiz Statistics</Typography>
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
								{categories.map((category) => (
									<MenuItem key={category} value={category}>
										{category}
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
						<>{/*NOSONAR*/}
							<StatsPie />
							<StatsArc />
							<Grid container spacing={2} className={"detailed-stats"}>
								<StatCard id='total-games' title="Total Games" value={statistics.totalGames} />
								<StatCard id='avg-score' title="Avg Score per Quiz" value={`${statistics.avgScore.toFixed(1)} points`} />
								<StatCard id='total-score' title="Total Score" value={`${statistics.totalScore} points`} />
								<StatCard id='total-answ' title="Correct Answers" value={statistics.totalCorrectAnswers} />
								<StatCard id='total-questions' title="Total Questions" value={statistics.totalQuestions} />
								<StatCard id='accuracy' title="Accuracy" value={`${(statistics.successRatio * 100).toFixed(1)}%`} />
								<StatCard id='avg-quiz-time' title="Avg Time per Quiz" value={`${statistics.avgTime.toFixed(1)} s`} />
							</Grid>
						</>
					)}
				</LoadingErrorHandler>
			</CardContent>

		</Card>
	)
}

function StatCard({ id,title, value }) {
	return (
		<Grid xs={12} sm={6} md={4}>
			<Paper id={id} elevation={2} sx={{ p: 2 }}>
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


