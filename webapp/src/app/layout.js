'use client';

import PropTypes from "prop-types"; 
import { Geist, Geist_Mono } from "next/font/google";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import { theme } from "../theme/theme"; 
import createEmotionCache from "../theme/createEmotionCache";
import "../styles/Fullscreen.css";
import "../styles/globals.css"; 

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
      <ThemeProvider theme={theme}>
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

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
