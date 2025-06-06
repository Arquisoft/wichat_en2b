"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { fetchWithAuth } from "../../../utils/api-fetch-auth";
import FinishResults from "@/components/wihoot/game/FinishResults";
import InGameChat from "@/components/game/InGameChat";
import Leaderboard from "@/components/wihoot/play/Leaderboard";
import PlayerList from "@/components/wihoot/play/PlayerList";
import { apiEndpoint, fetchJson, getToken, saveGameData } from "../../../utils/PlayerViewUtil";
import "../../../styles/wihoot/PlayerView.css";
import "../../../styles/QuestionGame.css";
import io from "socket.io-client";

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";


export default function PlayerView() {
  const router = useRouter();
  const { code, playerId } = router.query;

  const [, setSocket] = useState(null); // NOSONAR
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
  const [isLoading, setIsLoading] = useState(true); // NOSONAR
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerIntervalRef = useRef(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      if (!code || !playerId) {
        setError("Invalid session. Missing required parameters.");
        router.push("/");
      }
    }
  }, [router.isReady, code, playerId, router]);

  useEffect(() => {
    // Only redirect immediately for errors other than "host has left"
    if (error && error !== "The host has left the session") {
        router.push("/");
    }
  }, [error, router]);

  // Fetch session data
  const fetchSessionData = async () => {
    try {
      const sessionData = await fetchJson(`/shared-quiz/${code}/status?playerId=${playerId}`);
      setSessionStatus(sessionData.status);
      setPlayers(sessionData.players);
      setCurrentQuestionIndex(sessionData.currentQuestionIndex);
      setWaitingForNext(sessionData.waitingForNext);
      const player = sessionData.players.find((p) => p.id === playerId);
      if (player) setUsername(player.username);
      return sessionData;
    } catch (err) {
      if (err.status === 404 || err.message?.includes("not found") || err.message?.includes("does not exist")) {
        setError("Quiz not found. This session may have ended or does not exist.");
        router.push("/");
        return null;
      }
      if (err.status === 403) {
        setError("You are not authorized for this session");
        // Redirect to join page after a short delay
        setTimeout(() => {
          router.push("/wihoot/join");
        }, 3000);
        return null;
      }
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
        
        // Initialize timer with the fetched metadata - only if active
        if (sessionData.status === "active" && !sessionData.waitingForNext && currentQuestionIndex >= 0) {
          const timePerQuestion = quiz.quizMetaData?.[0]?.timePerQuestion || 60;
          const storedStartTime = localStorage.getItem(`startTime-${code}-${playerId}`);
          
          if (storedStartTime) {
            const elapsedSeconds = (Date.now() - Number(storedStartTime)) / 1000;
            setTimeLeft(Math.max(timePerQuestion - elapsedSeconds, 0));
          } else {
            const now = Date.now();
            setTimeLeft(timePerQuestion);
            setStartTime(now);
            localStorage.setItem(`startTime-${code}-${playerId}`, now.toString());
          }
        }
      } catch (err) {
        setError("Failed to load quiz data. The quiz may not exist.");
        setIsLoading(false);
        setTimeout(() => router.push("/"), 2000);
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
        setShowCorrectAnswer(false); // Reset showCorrectAnswer when session starts
        setShowCorrectAnswer(false); // Reset showCorrectAnswer when session starts
      });

      newSocket.on("question-changed", (data) => {
        const now = Date.now();
        setStartTime(now);
        localStorage.setItem(`startTime-${code}-${playerId}`, now.toString());
        setCurrentQuestionIndex(data.currentQuestionIndex);
        setHasAnswered(false);
        setSelectedOption(null);
        setWaitingForNext(false);
        setShowCorrectAnswer(false); // Reset showCorrectAnswer when question changes
      });

      newSocket.on("show-correct-answer", (data) => {
        if (data?.correctAnswer) {
          setCorrectAnswer(data.correctAnswer);
          setShowCorrectAnswer(true);
        }
      });

      newSocket.on("waiting-for-next", () => setWaitingForNext(true));

      newSocket.on("session-ended", (data) => {
        localStorage.removeItem(`startTime-${code}-${playerId}`);
        setSessionStatus("finished");
        setPlayers(data.players);
        setWaitingForNext(false);
      });

      newSocket.on("score-updated", (data) => setPlayers(data.players));

      newSocket.on("error", (data) => {
        console.error("Socket error:", data.message);
        setError(data.message);
        
        if (data.message?.includes("not found") || 
            data.message?.includes("does not exist") || 
            data.message?.includes("invalid") || 
            data.message?.includes("Invalid")) {
          router.push("/");
        }
      });

      newSocket.on("host-disconnected", (data) => {
        setError("The host has left the session");
        
        // Redirect to home after 3 seconds
        setTimeout(() => { // NOSONAR
          router.push("/");
        }, 3000);
      });

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

  // Timer logic
  useEffect(() => {
    // If we're not in an active quiz state, don't run the timer
    if (
      sessionStatus !== "active" ||
      waitingForNext ||
      currentQuestionIndex < 0 ||
      !quizMetaData
    ) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    // Always get fresh time per question from metadata
    const timePerQuestion = quizMetaData[0]?.timePerQuestion || 60;
    const storedTimerKey = `startTime-${code}-${playerId}`;
    const storedStartTime = localStorage.getItem(storedTimerKey);
    
    // Initialize timeLeft based on stored start time or current time
    let initialTimeLeft = timePerQuestion;
    if (storedStartTime) {
      const elapsed = (Date.now() - parseInt(storedStartTime, 10)) / 1000;
      initialTimeLeft = Math.max(0, timePerQuestion - elapsed);
    } else {
      // No stored start time, set one now
      localStorage.setItem(storedTimerKey, Date.now().toString());
    }
    
    // Update the timeLeft state
    setTimeLeft(initialTimeLeft);

    // Start the timer interval for continuous updates
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
    }, 100); // Update every 100ms for smooth countdown

    // Clean up on unmount or when dependencies change
    return () => clearInterval(timerIntervalRef.current);
  }, [sessionStatus, waitingForNext, hasAnswered, currentQuestionIndex, quizMetaData, code, playerId]);

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
          {hasAnswered && showCorrectAnswer && isCorrect && (
            <Alert id="message-success" severity="success" className="alert-box">
              Great job! You got it right!
            </Alert>
          )}
          {hasAnswered && showCorrectAnswer && !isCorrect && (
            <Alert id="message-fail" severity="error" className="alert-box">
              Oops! You didn't guess this one.
            </Alert>
          )}
          <div className="progress-indicator">
            Question {currentQuestionIndex + 1} of {quizData?.length || 0}
          </div>
          <h2 id="title-question" className="question-title">
            {currentQuestion.question || quizMetaData?.[0]?.question}
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
              const isSelected = selectedOption === index;

              let stateClass = "";

              if (hasAnswered) {
                if (showCorrectAnswer) {
                  // After host clicks "show correct answer"
                  if (correctAnswer === option) {
                    stateClass = "correct-answer";
                  } else if (isSelected) {
                    stateClass = "incorrect-answer";
                  }
                } else if (isSelected) {
                  // After answering, before host shows correct answer
                  stateClass = "waiting-answer";
                }
              }

              return (
                <button
                  id={`option-${index}`}
                  key={option}
                  className={`quiz-option ${isSelected ? "selected" : ""} ${stateClass}`}
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
        </CardContent>
      </Card>
    );
  };

  const renderHostDisconnected = () => (
    <Card className="player-view-card">
      <CardContent>
        <Box className="timer-container" mb={3}>
          <Typography variant="h6" className="timer-text error">
            Host Disconnected
          </Typography>
          <LinearProgress
            className="progress-bar host-disconnected-progress"
            variant="indeterminate"
          />
        </Box>
        <Box className="host-disconnected-container">
          <Typography variant="h5" className="host-disconnected-title">
            The host has left the session
          </Typography>
          <Typography variant="body1" className="host-disconnected-message">
            You will be redirected to the home page in a few seconds...
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" className="quiz-player-header">
        WiHoot - {quizMetaData?.[0]?.quizName || "Quiz"}
      </Typography>
      {error === "The host has left the session" ? renderHostDisconnected() : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {sessionStatus === "waiting" && renderWaitingRoom()}
          {sessionStatus === "active" && (waitingForNext ? renderLeaderboardView() : renderActiveQuiz())}
          {sessionStatus === "finished" && renderFinishedQuiz()}
        </>
      )}
    </Container>
  );
}