'use client';

import PropTypes from "prop-types"; 
import { CssBaseline, ThemeProvider } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import { theme } from "../theme/theme"; 
import createEmotionCache from "../theme/createEmotionCache";
import "../styles/Fullscreen.css";
import "../styles/globals.css"; 

const clientSideEmotionCache = createEmotionCache();

export default function RootLayout({ children }) {
  return (
    <CacheProvider value={clientSideEmotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <html lang="en">
          <body>
            {children}
          </body>
        </html>
      </ThemeProvider>
    </CacheProvider>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
