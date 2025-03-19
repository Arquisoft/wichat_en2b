"use client"

import { useState } from "react"
import AddUser from "../components/register/AddUser"
import Login from "../components/login/Login"
import QuestionGame from "../components/game/QuestionGame"
import HomePage from "../components/home/HomeViewPage"

import CssBaseline from "@mui/material/CssBaseline"
import Typography from "@mui/material/Typography"
import Link from "@mui/material/Link"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"

export default function Page() {
  const [currentView, setCurrentView] = useState("home")

  const handleToggleView = (view) => setCurrentView(view)

  const renderView = () => {
    const views = {
      login: <Login />,
      adduser: <AddUser />,
      questionGame: <QuestionGame />,
      home: <HomePage />,
    }
    return views[currentView] || <Login />
  }

  const renderLinks = () => {
    const links = []

    if (currentView !== "login") {
      links.push(
        <Link key="login" component="button" variant="body2" onClick={() => handleToggleView("login")}>
          Login
        </Link>,
      )
    } else {
      links.push(
        <Link key="register" component="button" variant="body2" onClick={() => handleToggleView("adduser")}>
          Register
        </Link>,
      )
    }

    links.push(
      <Link
        key="quiz"
        component="button"
        variant="body2"
        onClick={() => handleToggleView("questionGame")}
        sx={{ marginLeft: 2 }}
      >
        Take Quiz
      </Link>,
    )

    return (
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 2,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderTop: "1px solid rgba(0, 0, 0, 0.1)",
          display: "flex",
          justifyContent: "center",
          gap: 2,
          zIndex: 10,
        }}
      >
        {links.map((link) => (
          <Typography key={link.key} variant="body2">
            {link}
          </Typography>
        ))}
      </Box>
    )
  }

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          margin: 0,
          padding: 0,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, overflow: "auto" }}>{renderView()}</Box>
          {renderLinks()}
        </Paper>
      </Box>
    </>
  )
}

