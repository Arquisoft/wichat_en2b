"use client"; // This is needed

import HomePage from "../components/home/HomeViewPage";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import "../styles/globals.css";
import "../styles/Page.css";

export default function Page() {
	return (
		<>
			<CssBaseline />
			<Box className="App" >
				<Box className="App-header">
					<HomePage />
				</Box>
			</Box>
		</>
	);
}
