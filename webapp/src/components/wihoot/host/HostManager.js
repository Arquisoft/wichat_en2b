"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { fetchWithAuth } from "../../../utils/api-fetch-auth";
import io from "socket.io-client";
import axios from "axios";

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
                    console.log("Session data fetched:", sessionData);
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
                    console.log("Quiz data fetched:", quizData);
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
                console.log("Hosting session data:", data);
            });

            newSocket.on("player-joined", (data) => {
                console.log("Player joined:", data);
                setPlayers((prevPlayers) => [
                    ...prevPlayers,
                    {
                        id: data.playerId,
                        username: data.username,
                        isGuest: data.isGuest,
                        score: 0,
                    },
                ]);
            });

            newSocket.on("player-left", (data) => {
                setPlayers((prevPlayers) => prevPlayers.filter((player) => player.id !== data.playerId));
                console.log("Player left:", data);
            });

            newSocket.on("answer-submitted", (data) => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((player) => (player.id === data.playerId ? { ...player, score: data.score } : player))
                );
                console.log("Answer submitted:", data);
            });

            newSocket.on("error", (data) => {
                setError(data.message);
                console.log("Socket error:", data);
            });

            setSocket(newSocket);
            console.log("Socket initialized:", newSocket);
            return newSocket;
        };

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
                        console.log("Socket disconnected");
                    };
                } else {
                    setError("Failed to fetch host data");
                    console.log("No userId, setup aborted");
                }
            } catch (err) {
                console.error("Error in setup:", err);
                setError("An unexpected error occurred during setup");
            } finally {
                setIsLoading(false);
                console.log("Setup completed, isLoading:", false);
            }
        };

        const cleanup = setup();
        return () => {
            if (cleanup && typeof cleanup === "function") {
                cleanup();
                console.log("Cleanup executed");
            }
        };
    }, [code, router.isReady]);

    // Manejo de router.isReady y code no disponible
    if (!router.isReady) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-xl">Loading quiz data...</p>
                </div>
            </div>
        );
    }

    if (!code) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: No valid quiz code provided.
                </div>
                <button
                    onClick={() => router.push("/wihoot/create")}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Create New Quiz
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-xl">Loading...</p>
                </div>
            </div>
        );
    }

    const handleStartQuiz = async () => {
        if (players.length === 0) {
            setError("Cannot start quiz with no players");
            return;
        }

        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/start?hostId=${hostId}`, {
                method: "POST",
            });
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

            // Enviar la pregunta actual al endpoint para los jugadores
            const response = await fetchWithAuth(`/shared-quiz/${code}/next?hostId=${hostId}`, {
                method: "POST",
                body: JSON.stringify({
                    questionIndex: currentQuestionIndex,
                    question: currentQuestion,
                }),
            });

            if (!response) {
                throw new Error("Failed to move to next question");
            }

            const data = response;
            setCurrentQuestionIndex(data.currentQuestionIndex);

            // Verificar si hemos llegado al final del quiz
            if (quiz && data.currentQuestionIndex >= quiz.questions.length) {
                await handleEndQuiz();
            }
        } catch (err) {
            setError(err.message || "Failed to move to next question");
            console.error("Error in handleNextQuestion:", err);
        }
    };

    const handleEndQuiz = async () => {
        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/end?hostId=${hostId}`, {
                method: "POST",
            });

            if (!response) {
                throw new Error("Failed to end quiz");
            }

            const data = response;
            setSessionStatus(data.status);
            setPlayers(data.players);
        } catch (err) {
            setError(err.message || "Failed to end quiz");
            console.error("Error in handleEndQuiz:", err);
        }
    };

    const getCurrentQuestion = () => {
        if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
            return null;
        }
        return quiz.quizData[currentQuestionIndex];
    };

    const renderWaitingRoom = () => (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h2 className="text-2xl font-bold mb-4">Waiting for players</h2>

            <div className="mb-6">
                <p className="text-lg mb-2">Share this code with players:</p>
                <div className="bg-gray-100 p-4 text-center text-3xl font-bold tracking-wider">{code}</div>
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Players ({players.length})</h3>
                {players.length === 0 ? (
                    <p className="text-gray-500">No players have joined yet</p>
                ) : (
                    <ul className="bg-gray-100 p-4 rounded">
                        {players.map((player) => (
                            <li key={player.id} className="mb-2 flex items-center">
                                <span className="font-medium">{player.username}</span>
                                {player.isGuest && (
                                    <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                                        Guest
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                onClick={handleStartQuiz}
                disabled={players.length === 0}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            >
                Start Quiz
            </button>
        </div>
    );

    const renderActiveQuiz = () => {
        const currentQuestion = getCurrentQuestion();

        if (!currentQuestion) {
            return (
                <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                    <div className="text-red-700">No question available</div>
                </div>
            );
        }

        return (
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">
                        Question {currentQuestionIndex + 1} of {quiz?.quizData.length}
                    </h2>
                    <p className="text-lg mb-4">{quiz.quizMetadata.quizName}</p>
                    <ul className="space-y-2">
                        {currentQuestion.answers.map((option, index) => (
                            <li key={index} className="bg-gray-100 p-3 rounded">
                                {option}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">Leaderboard</h3>
                    {players.length === 0 ? (
                        <p className="text-gray-500">No players</p>
                    ) : (
                        <ul className="bg-gray-100 p-4 rounded">
                            {[...players]
                                .sort((a, b) => b.score - a.score)
                                .map((player, index) => (
                                    <li key={player.id} className="mb-2 flex justify-between items-center">
                                        <div>
                                            <span className="font-bold mr-2">#{index + 1}</span>
                                            <span className="font-medium">{player.username}</span>
                                            {player.isGuest && (
                                                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                                                    (Guest)
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-bold">{player.score}</span>
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>

                <button
                    onClick={handleNextQuestion}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    {currentQuestionIndex + 1 < quiz?.quizData.length ? "Next Question" : "End Quiz"}
                </button>
            </div>
        );
    };

    const renderFinishedQuiz = () => (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h2 className="text-2xl font-bold mb-4">Quiz Completed</h2>

            <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Final Results</h3>
                {players.length === 0 ? (
                    <p className="text-gray-500">No players participated</p>
                ) : (
                    <ul className="bg-gray-100 p-4 rounded">
                        {[...players]
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                                <li key={player.id} className="mb-2 flex justify-between items-center">
                                    <div>
                                        <span className="font-bold mr-2">#{index + 1}</span>
                                        <span className="font-medium">{player.username}</span>
                                        {player.isGuest && (
                                            <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                                                Guest
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold">{player.score}</span>
                                </li>
                            ))}
                    </ul>
                )}
            </div>

            <button
                onClick={() => router.push("/shared-quiz/create")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
                Create New Quiz
            </button>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Quiz Host - {code}</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
            )}

            {sessionStatus === "waiting" && renderWaitingRoom()}
            {sessionStatus === "active" && renderActiveQuiz()}
            {sessionStatus === "finished" && renderFinishedQuiz()}
        </div>
    );
}