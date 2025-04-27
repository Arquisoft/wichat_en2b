"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { fetchWithAuth } from "../../../utils/api-fetch-auth";
import io from "socket.io-client";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import FinishResults from "@/components/wihoot/game/FinishResults";
import InGameChat from "@/components/game/InGameChat";
import Leaderboard from "@/components/wihoot/play/Leaderboard";
import PlayerList from "@/components/wihoot/play/PlayerList";
import { apiEndpoint, fetchJson, getToken, saveGameData } from "../../../utils/PlayerViewUtil";
import "../../../styles/wihoot/PlayerView.css";
import "../../../styles/QuestionGame.css";

export default function PlayerView() {
  const router = useRouter();
  const { code, playerId } = router.query;

  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState("");
  const [sessionStatus, setSessionStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [quizData, setQuizData] = useState(null);
  const [quizMetaData, setQuizMetaData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerIntervalRef = useRef(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  // Fetch session data
  const fetchSessionData = async () => {
    try {
      const sessionData = await fetchJson(`/shared-quiz/${code}/status`);
      setSessionStatus(sessionData.status);
      setPlayers(sessionData.players);
      setCurrentQuestionIndex(sessionData.currentQuestionIndex);
      setWaitingForNext(sessionData.waitingForNext);
      const player = sessionData.players.find((p) => p.id === playerId);
      if (player) setUsername(player.username);
      return sessionData;
    } catch (err) {
      setError("Failed to load session data");
      console.error(err);
      return null;
    }
  };

  // Initialize socket and fetch initial data
  useEffect(() => {
    if (!code || !playerId) return;

    const fetchUserData = async () => {
      try {
        const userData = await fetchWithAuth("/token/username");
        if (userData) {
          setUsername(userData.username);
          return userData;
        }
        throw new Error("Failed to get user data");
      } catch (err) {
        setError("Authentication error. Please log in again.");
        console.error(err);
        return null;
      }
    };

    const fetchQuizData = async (sessionData) => {
      if (!sessionData) return;
      try {
        const quiz = await fetchJson(`/internal/quizdata/${code}`);
        setQuizData(quiz.quizData);
        setQuizMetaData(quiz.quizMetaData);
      } catch (err) {
        setError("Failed to load quiz data");
        console.error(err);
      }
    };

    const initializeSocket = () => {
      // Determine the Socket.IO URL based on environment
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

      const newSocket = io(socketUrl, {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'], // Prefer WebSocket
      });

      const handleSessionUpdate = () => fetchSessionData();

      newSocket.on("connect", () => {
        console.log("Socket connected");
        newSocket.emit("join-session", { code, playerId, username });
      });

      newSocket.on("joined-session", handleSessionUpdate);
      newSocket.on("player-joined", handleSessionUpdate);
      newSocket.on("player-left", handleSessionUpdate);

      newSocket.on("session-started", (data) => {
        const now = Date.now();
        setStartTime(now);
        localStorage.setItem(`startTime-${code}-${playerId}`, now.toString());
        setSessionStatus("active");
        setCurrentQuestionIndex(data.currentQuestionIndex);
        setHasAnswered(false);
        setSelectedOption(null);
        setWaitingForNext(false);
      });

      newSocket.on("question-changed", (data) => {
        const now = Date.now();
        setStartTime(now);
        localStorage.setItem(`startTime-${code}-${playerId}`, now.toString());
        setCurrentQuestionIndex(data.currentQuestionIndex);
        setHasAnswered(false);
        setSelectedOption(null);
        setWaitingForNext(false);
      });

      newSocket.on("show-correct-answer", () => {
        console.log("Received show-correct-answer");
        setShowCorrectAnswer(true);
        setTimeout(() => {
          setShowCorrectAnswer(false);
          setWaitingForNext(true);
        }, 2000);
      });

      newSocket.on("waiting-for-next", () => setWaitingForNext(true));

      newSocket.on("session-ended", (data) => {
        localStorage.removeItem(`startTime-${code}-${playerId}`);
        setSessionStatus("finished");
        setPlayers(data.players);
        setWaitingForNext(false);
      });

      newSocket.on("score-updated", (data) => setPlayers(data.players));

      newSocket.on("error", (data) => setError(data.message));

      setSocket(newSocket);
      return newSocket;
    };

    const setup = async () => {
      setIsLoading(true);
      try {
        await fetchUserData();
        const sessionData = await fetchSessionData();
        await fetchQuizData(sessionData);
        const newSocket = initializeSocket();
        return () => newSocket?.disconnect();
      } finally {
        setIsLoading(false);
      }
    };

    const cleanup = setup();
    return () => typeof cleanup === "function" && cleanup();
  }, [code, playerId, username]);

  // Check for previous answers
  useEffect(() => {
    if (!quizData || currentQuestionIndex < 0 || !players.length) return;

    const currentQuestion = quizData[currentQuestionIndex];
    const player = players.find((p) => p.id === playerId);

    if (player && currentQuestion) {
      const hasAnsweredQuestion = player.answers.some(
        (answer) => answer.questionId === currentQuestion.question_id
      );
      setHasAnswered(hasAnsweredQuestion);
      if (hasAnsweredQuestion) {
        const answer = player.answers.find(
          (answer) => answer.questionId === currentQuestion.question_id
        );
        setSelectedOption(parseInt(answer.answerId));
        setIsCorrect(answer.isCorrect);
        fetchJson("/question/validate", {
          method: "POST",
          body: JSON.stringify({
            question_id: currentQuestion.question_id,
            selected_answer: currentQuestion.answers[0],
          }),
        }).then(({ correctAnswer }) => setCorrectAnswer(correctAnswer)).catch((err) =>
          console.error("Failed to fetch correct answer:", err)
        );
      } else {
        setSelectedOption(null);
        setIsCorrect(false);
        setCorrectAnswer(null);
      }
    }
  }, [quizData, players, currentQuestionIndex, playerId]);

  // Save game data when quiz ends
  useEffect(() => {
    if (sessionStatus === "finished" && !hasSavedGame) {
      const token = getToken();
      if (token) {
        const player = players.find((p) => p.id === playerId);
        if (player) {
          saveGameData(token, {
            subject:
              quizMetaData?.[0]?.category.toLowerCase() ||
              quizMetaData?.[0]?.quizName.toLowerCase() ||
              "unknown",
            points_gain: player.score,
            number_of_questions: player.answers.length,
            number_correct_answers: answers.filter((a) => a.isCorrect).length,
            total_time: answers.reduce((acc, a) => acc + a.timeSpent, 0),
          });
        }
      }
      setHasSavedGame(true);
    }
  }, [sessionStatus, hasSavedGame, players, playerId, quizMetaData, answers]);

  // Synchronize timeLeft
  useEffect(() => {
    if (
      sessionStatus === "active" &&
      !waitingForNext &&
      !hasAnswered &&
      currentQuestionIndex >= 0 &&
      quizMetaData
    ) {
      const timePerQuestion = quizMetaData?.[0]?.timePerQuestion || 60;
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now());
    }
  }, [sessionStatus, waitingForNext, hasAnswered, currentQuestionIndex, quizMetaData]);

  useEffect(() => {
    if (!quizMetaData || !code || !playerId) return;

    const storedStartTime = localStorage.getItem(`startTime-${code}-${playerId}`);
    if (storedStartTime) {
      const elapsedSeconds = (Date.now() - Number(storedStartTime)) / 1000;
      const timerDuration = quizMetaData[0]?.timePerQuestion || 60;
      setTimeLeft(Math.max(timerDuration - elapsedSeconds, 0));
    }
  }, [quizMetaData, code, playerId]);

  // Timer logic
  useEffect(() => {
    if (
        sessionStatus !== "active" ||
        waitingForNext ||
        timeLeft === null ||
        currentQuestionIndex < 0
    ) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    const timePerQuestion = 60; // or dynamically set if needed
    const storedTimerKey = `startTime-${code}-${playerId}`;
    const storedStartTime = localStorage.getItem(storedTimerKey);
    let initialTimeLeft = timePerQuestion;

    // If there's a stored start time for this session, calculate the time left
    if (storedStartTime) {
      const elapsed = (Date.now() - parseInt(storedStartTime, 10)) / 1000;
      initialTimeLeft = Math.max(0, timePerQuestion - elapsed);
    } else {
      // No stored start time, so set a new start time
      localStorage.setItem(storedTimerKey, Date.now().toString());
    }

    setTimeLeft(initialTimeLeft);

    let lastUpdate = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastUpdate) / 1000; // in seconds
      lastUpdate = now;

      setTimeLeft(prevTime => {
        const newTime = prevTime - delta;

        if (newTime <= 0) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }

        return newTime;
      });
    }, 100);

    return () => clearInterval(timerIntervalRef.current);
  }, [sessionStatus, waitingForNext, hasAnswered, timeLeft, currentQuestionIndex, code, playerId]);

  const getCurrentQuestion = () => {
    if (!quizData || currentQuestionIndex < 0 || currentQuestionIndex >= quizData.length) {
      return null;
    }
    return quizData[currentQuestionIndex];
  };

  const handleAnswerSubmit = async (optionIndex) => {
    if (hasAnswered) return;

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    setSelectedOption(optionIndex);
    setHasAnswered(true);
    const storedStartTime = localStorage.getItem(`startTime-${code}-${playerId}`);
    let answerTime = startTime;
    if (storedStartTime) {
      answerTime = Number(storedStartTime);
    }

    const timeToAnswer = (Date.now() - answerTime) / 1000;
    const { isCorrect, correctAnswer } = await fetchJson("/question/validate", {
      method: "POST",
      body: JSON.stringify({
        question_id: currentQuestion.question_id,
        selected_answer: currentQuestion.answers[optionIndex],
      }),
    });
    setIsCorrect(isCorrect);

    const timerDuration = quizMetaData[0].timePerQuestion;
    const timeLeft = timerDuration - timeToAnswer;
    const numberOptions = currentQuestion.answers.length;
    const points = isCorrect
      ? Math.ceil((10 * (80 * numberOptions / timerDuration) * (timeLeft / timerDuration)))
      : 0;

    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.question_id,
        answerId: optionIndex,
        isCorrect,
        timeSpent: timeToAnswer,
        points,
        rightAnswer: correctAnswer,
        answer: currentQuestion.answers[optionIndex],
      },
    ]);

    try {
      await fetchJson(`/shared-quiz/${code}/answer`, {
        method: "POST",
        body: JSON.stringify({
          playerId,
          questionId: currentQuestion.question_id,
          answerId: optionIndex,
          isCorrect,
          timeToAnswer,
          rightAnswer: correctAnswer,
          answer: currentQuestion.answers[optionIndex],
        }),
      });
      const sessionData = await fetchSessionData();
      if (sessionData) setPlayers(sessionData.players);
    } catch (err) {
      console.error("Failed to submit answer or fetch session data:", err);
    }
  };

  const renderWaitingRoom = () => (
    <Card className="player-view-card">
      <CardContent>
        <Box className="timer-container">
          <Typography variant="body2" className="timer-text">
            Waiting for host...
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
            Get ready for the quiz!🚀
          </Typography>
        </Box>
        <Box className="code-display" mb={4}>
          <Typography variant="h6" className="joined-text" sx={{ mb: 1 }}>
            You've joined with code:
          </Typography>
          <Typography variant="h4" className="code-text">
            {code}
          </Typography>
        </Box>
        <Box mb={3}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Players ({players.length})
          </Typography>
          <PlayerList players={players} playerId={playerId} />
        </Box>
        <Box
          sx={{
            textAlign: "center",
            p: 3,
            borderRadius: "8px",
            background: "linear-gradient(to right, #f5f5f5, #ffffff, #f5f5f5)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500, color: "#555" }}>
            The host will start the quiz soon. Get ready!
          </Typography>
        </Box>
        <Box className="divider" sx={{ mt: 4 }} />
      </CardContent>
    </Card>
  );

  const renderLeaderboardView = () => (
    <Card className="player-view-card">
      <CardHeader title={`Leaderboard - Question ${currentQuestionIndex + 1} Results`} />
      <CardContent>
        <Leaderboard players={players} playerId={playerId} title="Current Standings" />
        <Typography variant="body2" color="textSecondary" align="center">
          Waiting for the host to proceed to the next question...
        </Typography>
      </CardContent>
    </Card>
  );

  const renderActiveQuiz = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) {
      return (
        <div className="loading-container">
          <CircularProgress className="loading-spinner" />
          <p className="loading-text">Loading your quiz...</p>
        </div>
      );
    }

    return (
      <div className="quiz-wrapper">
        <Box className="timer-container">
          <Typography variant="body2" className="timer-text" id="quiz-timer">
            Time left: {Math.ceil(timeLeft)}s
          </Typography>
          <LinearProgress
            className="progress-bar"
            variant="determinate"
            value={(timeLeft / (quizMetaData?.[0]?.timePerQuestion || 60)) * 100}
          />
        </Box>
        <div className="content-box">
          {hasAnswered && isCorrect && (
            <Alert id="message-success" severity="success" className="alert-box">
              Great job! You got it right!
            </Alert>
          )}
          {hasAnswered && !isCorrect && (
            <Alert id="message-fail" severity="error" className="alert-box">
              Oops! You didn't guess this one.
            </Alert>
          )}
          <div className="progress-indicator">
            Question {currentQuestionIndex + 1} of {quizData?.length || 0}
          </div>
          <h2 id="title-question" className="question-title">
            {currentQuestion.question || quizMetaData?.[0]?.question || "Untitled Quiz"}
          </h2>
          <div className="image-box">
            <img
              src={`${apiEndpoint}${currentQuestion.image_name}`}
              alt="Question"
              className="quiz-image"
            />
          </div>
          <div className="options-box">
            {currentQuestion.answers.map((option, index) => {
              return (
                  <button
                      id={`option-${index}`}
                      key={option}
                      className={`quiz-option 
                      ${selectedOption === index ? "selected" : ""} 
                      ${(hasAnswered && selectedOption === index && isCorrect) ||
                      (showCorrectAnswer && correctAnswer === option)
                          ? "correct-answer"
                          : ""}
      `}
                      onClick={() => handleAnswerSubmit(index)}
                      disabled={hasAnswered}
                  >
                    {option}
                  </button>
              );
            })}
          </div>
          <InGameChat initialMessages={[]} question={currentQuestion} />
        </div>
        <div className="divider"></div>
      </div>
    );
  };

  const renderFinishedQuiz = () => {
    const player = players.find((p) => p.id === playerId);
    return (
      <Card className="player-view-card">
        <CardHeader title="Quiz Completed" />
        <CardContent>
          <Leaderboard players={players} playerId={playerId} title="Final Results" />
          {player && (
            <FinishResults
              answers={player.answers}
              score={player.score}
              subject={quizMetaData?.[0]?.category}
            />
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/wihoot/join")}
          >
            Join Another Quiz
          </Button>
        </CardContent>
      </Card>
    );
  };

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
        WiHoot - {username}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {sessionStatus === "waiting" && renderWaitingRoom()}
      {sessionStatus === "active" && (waitingForNext ? renderLeaderboardView() : renderActiveQuiz())}
      {sessionStatus === "finished" && renderFinishedQuiz()}
    </Container>
  );
}