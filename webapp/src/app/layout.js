'use client';

import PropTypes from "prop-types"; // Import PropTypes for validation
import { Geist, Geist_Mono } from "next/font/google";
import { CssBaseline } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import ThemeProvider from "../theme/ThemeContext";
import createEmotionCache from "../theme/createEmotionCache";
import "../styles/Fullscreen.css";

const clientSideEmotionCache = createEmotionCache();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <CacheProvider value={clientSideEmotionCache}>
      <ThemeProvider>
        <CssBaseline />
        <html lang="en">
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            {children}
          </body>
        </html>
      </ThemeProvider>
    </CacheProvider>
  );
}

// Add PropTypes validation
RootLayout.propTypes = {
  children: PropTypes.node.isRequired, // Validate that 'children' is a required React node
};
