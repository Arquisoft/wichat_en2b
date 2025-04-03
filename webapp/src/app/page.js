"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HomePage from "../components/home/HomeViewPage"; // For logged-in users
import IntroHomePage from "../components/home/IntroHomePage"; // For anonymous users
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import "../styles/globals.css";
import "../styles/Page.css";

/**
 * Main Page component that dynamically renders based on login status.
 *
 * @returns {JSX.Element} The rendered Page component.
 */
export default function Page() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status
    const [isClient, setIsClient] = useState(false); // Ensure code runs only on client

    // Set isClient to true only when the component mounts on the client
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Check login status only on the client side
    useEffect(() => {
        if (isClient) {
            const loggedIn = document.cookie.includes("token"); // Check token in cookies
            setIsLoggedIn(loggedIn);
        }
    }, [isClient, router]);

    // Render nothing or a loading state until we know if we're on the client
    if (!isClient) {
        return null; // Or a loading spinner/component
    }

    return (
        <>
            <CssBaseline />/login
            </Box>
        </>
    );
}