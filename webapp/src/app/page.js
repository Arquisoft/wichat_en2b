"use client";

import { useState } from "react"
import AddUser from "../components/register/AddUser"
import Login from "../components/login/Login"
import QuestionGame from "../components/game/QuestionGame"
import HomePage from "../components/home/HomeViewPage"

import CssBaseline from "@mui/material/CssBaseline"
import Box from "@mui/material/Box"

export default function Page() {
  const [currentView] = useState("home")

  const views = {
    login: <Login />,
    adduser: <AddUser />,
    questionGame: <QuestionGame />,
    home: <HomePage />,
  }

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
        <Box sx={{ flex: 1, overflow: "auto" }}>{views[currentView] || <Login />}</Box>
      </Box>
    </>
  );
}