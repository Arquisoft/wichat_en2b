'use client'; // This is needed

import PropTypes from "prop-types"; 
import { CssBaseline, ThemeProvider } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import { theme } from "../theme/theme"; 
import createEmotionCache from "../theme/createEmotionCache";
import "../styles/Fullscreen.css";
import "../styles/globals.css"; 

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

/**
 * RootLayout component that wraps the application with necessary providers.
 * 
 * @param {*} children - Contains the children components to be rendered.
 * 
 * @returns {JSX.Element} - The rendered layout of the application.
 */
export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body> 
				<CacheProvider value={clientSideEmotionCache}>
					<ThemeProvider theme={theme}>
						<CssBaseline />
						{children}
					</ThemeProvider>
				</CacheProvider>
			</body>
		</html>
	);
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};