"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { fetchWithAuth } from "../../../utils/api-fetch-auth";
import io from "socket.io-client";
import axios from "axios";
import {
  Box,
  Container,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Badge,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import "../../../styles/wihoot/PlayerView.css";
import "../../../styles/wihoot/HostManager.css";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000";

export default function HostManager() {
  const router = useRouter();
  const { code } = router.query;

  const [socket, setSocket] = useState(null);
  const [hostId, setHostId] = useState("");
  const [sessionStatus, setSessionStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerIntervalRef = useRef(null);

  // Initialize socket connection and fetch session data
  useEffect(() => {
    if (!router.isReady || !code) {
      return;
    }

    const fetchUserData = async () => {
      try {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1];

        const response = await axios.get(`${apiEndpoint}/token/username`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data) {
          const userData = response.data;
          setHostId(userData._id);
          return userData._id;
        } else {
          throw new Error("Failed to get user data");
        }
      } catch (err) {
        setError("Authentication error. Please log in again.");
        console.error("Error in fetchUserData:", err);
        return null;
      }
    };

    const fetchSessionData = async () => {
      try {
        const response = await fetchWithAuth(`/shared-quiz/${code}/status`);
        if (response) {
          const sessionData = response;
          setSessionStatus(sessionData.status);
          setPlayers(sessionData.players);
          setCurrentQuestionIndex(sessionData.currentQuestionIndex);
          return sessionData;
        } else {
          throw new Error("Failed to fetch session data");
        }
      } catch (err) {
        setError("Failed to load session data");
        console.error("Error in fetchSessionData:", err);
        return null;
      }
    };

    const fetchQuizData = async (sessionData) => {
      if (!sessionData) {
        return;
      }

      try {
        const response = await fetchWithAuth(`/internal/quizdata/${code}`);
        if (response) {
          const quizData = response;
          setQuiz(quizData);
        } else {
          throw new Error("Failed to fetch quiz data");
        }
      } catch (err) {
        setError("Failed to load quiz data");
        console.error("Error in fetchQuizData:", err);
      }
    };

    const initializeSocket = (hostId) => {
      if (!hostId) {
        console.log("No hostId, skipping initialize Socket");
        return;
      }

      const newSocket = io(process.env.SOCKET_SERVER || "http://localhost:8006");

      newSocket.on("connect", () => {
        console.log("Socket connected");
        newSocket.emit("host-session", { code, hostId });
      });

      newSocket.on("hosting-session", (data) => {
        setSessionStatus(data.status);
        setPlayers(data.players);
        setCurrentQuestionIndex(data.currentQuestionIndex);
      });

      newSocket.on("player-joined", (data) => {
        fetchSessionData();
      });

      newSocket.on("player-left", (data) => {
        fetchSessionData();
      });

      newSocket.on("answer-submitted", (data) => {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) =>
            player.id === data.playerId ? { ...player, score: data.score } : player
          )
        );
      });

      newSocket.on("error", (data) => {
        setError(data.message);
      });

      setSocket(newSocket);
      return newSocket;
    };

    let cleanupFn;
    const setup = async () => {
      setIsLoading(true);
      try {
        const userId = await fetchUserData();
        if (userId) {
          const sessionData = await fetchSessionData();
          await fetchQuizData(sessionData);
          const newSocket = initializeSocket(userId);
          return () => {
            if (newSocket) newSocket.disconnect();
          };
        } else {
          setError("Failed to fetch host data");
        }
      } catch (err) {
        console.error("Error in setup:", err);
        setError("An unexpected error occurred during setup");
      } finally {
        setIsLoading(false);
      }
    };

    setup().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      if (cleanupFn && typeof cleanupFn === "function") {
        cleanupFn();
      }
    };
  }, [code, router.isReady]);

  // Synchronize timeLeft with quiz.quizMetaData and currentQuestionIndex
  useEffect(() => {
    if (
      sessionStatus === "active" &&
      !showLeaderboard &&
      currentQuestionIndex >= 0 &&
      quiz
    ) {
      const timePerQuestion = quiz.quizMetaData?.[0]?.timePerQuestion || 60;
      setTimeLeft(timePerQuestion);
    }
  }, [sessionStatus, showLeaderboard, currentQuestionIndex, quiz]);

  // Timer logic
  useEffect(() => {
    if (
      sessionStatus !== "active" ||
      showLeaderboard ||
      timeLeft === null ||
      currentQuestionIndex < 0
    ) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timerIntervalRef.current);
          handleNextQuestion();
          return 0;
        }
        return prevTime - 0.1; // Update every 100ms for smoother progress
      });
    }, 100); // Use 100ms interval for smoother updates

    return () => {
      clearInterval(timerIntervalRef.current);
    };
  }, [sessionStatus, showLeaderboard, timeLeft, currentQuestionIndex]);

  const handleStartQuiz = async () => {
    if (players.length === 0) {
      setError("Cannot start quiz with no players");
      return;
    }

    try {
      const response = await fetchWithAuth(`/shared-quiz/${code}/start?hostId=${hostId}`);
      if (!response) {
        throw new Error("Failed to start quiz");
      }

      const data = response;
      setSessionStatus(data.status);
      setCurrentQuestionIndex(data.currentQuestionIndex);
    } catch (err) {
      setError(err.message || "Failed to start quiz");
      console.error("Error in handleStartQuiz:", err);
    }
  };

  const handleNextQuestion = async () => {
    try {
      const currentQuestion = getCurrentQuestion();
      if (!currentQuestion) {
        throw new Error("No current question available");
      }

      if (currentQuestionIndex + 1 >= quiz.quizData.length) {
        await handleEndQuiz();
      } else {
        if (socket) {
          socket.emit("waiting-for-next", { code });
        }
        setShowLeaderboard(true);
      }
    } catch (err) {
      setError(err.message || "Failed to move to next question");
      console.error("Error in handleNextQuestion:", err);
    }
  };

  const handleLeaderboardNext = async () => {
    try {
      const response = await fetchWithAuth(`/shared-quiz/${code}/next?hostId=${hostId}`);
      if (!response) {
        throw new Error("Failed to move to next question");
      }

      const data = response;
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setShowLeaderboard(false);

      if (quiz && data.currentQuestionIndex >= quiz.quizData.length) {
        await handleEndQuiz();
      }
    } catch (err) {
      setError(err.message || "Failed to move to next question");
      console.error("Error in handleLeaderboardNext:", err);
    }
  };

  const handleEndQuiz = async () => {
    try {
      const response = await fetchWithAuth(`/shared-quiz/${code}/end?hostId=${hostId}`);
      if (!response) {
        throw new Error("Failed to end quiz");
      }

      const data = response;
      setSessionStatus(data.status);
      setPlayers(data.players);
      setShowLeaderboard(false);
    } catch (err) {
      setError(err.message || "Failed to end quiz");
      console.error("Error in handleEndQuiz:", err);
    }
  };

  const getCurrentQuestion = () => {
    if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.quizData.length) {
      return null;
    }
    return quiz.quizData[currentQuestionIndex];
  };

  const renderWaitingRoom = () => (
    <Card className="player-view-card">
      <CardContent>
        <Box className="timer-container">
          <Typography variant="body2" className="timer-text">
            Waiting for players...
          </Typography>
          <LinearProgress
            className="progress-bar"
            variant="indeterminate"
            sx={{
              background: "#e0e0e0",
              height: "8px",
              borderRadius: "4px",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #6c63ff, #ff6584)",
              },
            }}
          />
        </Box>
        <Box sx={{ textAlign: "center", my: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Click Start Quiz when ready 🛸
          </Typography>
        </Box>
        <Box className="code-display" mb={3}>
          <Typography variant="h6" className="joined-text" sx={{ mb: 1 }}>
            Share this code with players:
          </Typography>
          <Typography variant="h4" className="code-text">
            {code}
          </Typography>
        </Box>
        <Box mb={3}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Players ({players.length})
          </Typography>
          {players.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No players have joined yet
            </Typography>
          ) : (
            <List className="players-list">
              {players.map((player) => (
                <ListItem
                  key={player.id}
                  className="player-item"
                  sx={{
                    mb: 1,
                    borderRadius: "6px",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <ListItemText
                    primary={player.username}
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontWeight: 500,
                        fontSize: "1rem",
                      },
                    }}
                  />
                  {player.isGuest && (
                    <Badge badgeContent="Guest" color="secondary" sx={{ mr: 1 }} />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        <Button
          variant="contained"
          onClick={handleStartQuiz}
          disabled={players.length === 0}
          className="action-button"
        >
          Start Quiz
        </Button>
        <Box className="divider" sx={{ mt: 4 }} />
      </CardContent>
    </Card>
  );

  const renderLeaderboardView = () => (
    <Card className="host-manager-card">
      <CardHeader title={`Leaderboard - Question ${currentQuestionIndex + 1} Results`} />
      <CardContent>
        <Box mb={3}>
          <Typography variant="h6">Current Standings</Typography>
          {players.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No players
            </Typography>
          ) : (
            <List className="leaderboard-list">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <ListItem key={player.id} className="leaderboard-item">
                    <ListItemText
                      primary={`#${index + 1} ${player.username}`}
                      secondary={
                        player.isGuest && <Badge badgeContent="Guest" color="secondary" />
                      }
                    />
                    <Typography variant="body1" fontWeight="bold">
                      {player.score}
                    </Typography>
                  </ListItem>
                ))}
            </List>
          )}
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLeaderboardNext}
          className="action-button"
        >
          {currentQuestionIndex + 1 < quiz?.quizData.length ? "Next Question" : "End Quiz"}
        </Button>
      </CardContent>
    </Card>
  );

  const renderActiveQuiz = () => {
    const currentQuestion = getCurrentQuestion();

    if (!currentQuestion) {
      return (
        <Card className="host-manager-card">
          <CardContent>
            <Typography variant="h6" color="error">
              No question available
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="host-manager-card">
        <CardHeader
          title={`Question ${currentQuestionIndex + 1} of ${quiz?.quizData.length}`}
        />
        <CardContent>
          <Box className="timer-container">
            <Typography variant="body2" className="timer-text" id="quiz-timer">
              Time left: {Math.ceil(timeLeft)}s
            </Typography>
            <LinearProgress
              className="progress-bar"
              variant="determinate"
              value={(timeLeft / (quiz?.quizMetaData[0]?.timePerQuestion || 60)) * 100}
            />
          </Box>
          <Typography variant="h6" mb={2}>
            {quiz.quizMetaData[0]?.quizName || "Untitled Quiz"}
          </Typography>
          <Box className="image-box" mb={3}>
            <img
              src={`${apiEndpoint}${currentQuestion.image_name}`}
              alt="Question"
              className="quiz-image"
            />
          </Box>
          <List className="options-list">
            {currentQuestion.answers.map((option, index) => (
              <ListItem key={index} className="option-item">
                <ListItemText primary={option} />
              </ListItem>
            ))}
          </List>
          <Box mt={3} mb={3}>
            <Typography variant="h6">Leaderboard</Typography>
            {players.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No players
              </Typography>
            ) : (
              <List className="leaderboard-list">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <ListItem key={player.id} className="leaderboard-item">
                      <ListItemText
                        primary={`#${index + 1} ${player.username}`}
                        secondary={
                          player.isGuest && <Badge badgeContent="Guest" color="secondary" />
                        }
                      />
                      <Typography variant="body1" fontWeight="bold">
                        {player.score}
                      </Typography>
                    </ListItem>
                  ))}
              </List>
            )}
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNextQuestion}
            className="action-button"
          >
            {currentQuestionIndex + 1 < quiz?.quizData.length ? "Next Question" : "End Quiz"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderFinishedQuiz = () => (
    <Card className="host-manager-card">
      <CardHeader title="Quiz Completed" />
      <CardContent>
        <Box mb={3}>
          <Typography variant="h6">Final Results</Typography>
          {players.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No players participated
            </Typography>
          ) : (
            <List className="results-list">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <ListItem key={player.id} className="result-item">
                    <ListItemText
                      primary={`#${index + 1} ${player.username}`}
                      secondary={
                        player.isGuest && <Badge badgeContent="Guest" color="secondary" />
                      }
                    />
                    <Typography variant="body1" fontWeight="bold">
                      {player.score}
                    </Typography>
                  </ListItem>
                ))}
            </List>
          )}
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push("/wihoot/create")}
          className="action-button"
        >
          Create New Quiz
        </Button>
      </CardContent>
    </Card>
  );

  if (!router.isReady) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center">
          <CircularProgress />
          <Typography variant="h6" mt={2}>
            Loading quiz data...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!code) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: No valid quiz code provided.
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push("/wihoot/create")}
        >
          Create New Quiz
        </Button>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center">
          <CircularProgress />
          <Typography variant="h6" mt={2}>
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" className="quiz-player-header">
        WiHoot
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {sessionStatus === "waiting" && renderWaitingRoom()}
      {sessionStatus === "active" &&
        (showLeaderboard ? renderLeaderboardView() : renderActiveQuiz())}
      {sessionStatus === "finished" && renderFinishedQuiz()}
    </Container>
  );
}