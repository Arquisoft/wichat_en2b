"use client";

import { useState, useEffect } from "react";
import AddUser from "../components/register/AddUser";
import Login from "../components/login/Login";
import QuestionGame from "../components/game/QuestionGame";
import HomePage from "../components/home/HomeViewPage";

import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import "../styles/globals.css";

export default function Page() {
  const [currentView, setCurrentView] = useState(null); // Inicializar como null

  const views = {
    login: <Login />,
    adduser: <AddUser />,
    questionGame: <QuestionGame />,
    home: <HomePage />,
  };

  useEffect(() => {
    // Aseguramos que `currentView` tenga un valor después de la renderización en el cliente
    setCurrentView("home");
  }, []); // Se ejecuta solo después de la carga inicial en el cliente

  if (currentView === null) {
    // Mientras se espera el estado inicial
    return null;
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
          paddingBottom: "80px",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {views[currentView] || <Login />}
        </Box>
      </Box>
    </>
  );
}
