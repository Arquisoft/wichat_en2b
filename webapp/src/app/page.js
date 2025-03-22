"use client"; // This is needed

import { useState, useEffect } from "react";
import AddUser from "../components/register/AddUser";
import Login from "../components/login/Login";
import QuestionGame from "@/components/game/QuestionGame";
import HomePage from "../components/home/HomeViewPage";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import "../styles/globals.css";
import "../styles/Page.css";

export default function Page() {
	const [currentView, setCurrentView] = useState(null); 

	const views = {
		login: <Login />,
		adduser: <AddUser />,
		questionGame: <QuestionGame topic={'Q515'} totalQuestions={'10'} numberOptions={'4'} timerDuration={'20'} question={'What city is shown in the image?'} />,
		home: <HomePage />,
	};

	useEffect(() => {
		setCurrentView("home");
	}, []); 

	if (currentView === null) {
		return null;
	}

	return (
		<>
			<CssBaseline />
			<Box className="App">
				<Box className="App-header">
					{views[currentView] || <Login />}
				</Box>
			</Box>
		</>
	);