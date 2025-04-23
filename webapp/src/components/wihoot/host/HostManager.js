"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { fetchWithAuth } from "../../../utils/api-fetch-auth"
import io from "socket.io-client"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function HostManager() {
    const router = useRouter()
    const { code } = router.query

    const [socket, setSocket] = useState(null)
    const [hostId, setHostId] = useState("")
    const [sessionStatus, setSessionStatus] = useState("waiting")
    const [players, setPlayers] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
    const [quiz, setQuiz] = useState(null)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    // Initialize socket connection and fetch session data
    useEffect(() => {
        if (!code) return

        const fetchUserData = async () => {
            try {
                const response = await fetchWithAuth("/token/username")
                if (response.ok) {
                    const userData = await response.json()
                    setHostId(userData.id)
                    return userData.id
                } else {
                    throw new Error("Failed to get user data")
                }
            } catch (err) {
                setError("Authentication error. Please log in again.")
                console.error(err)
                return null
            }
        }

        const fetchSessionData = async (hostId) => {
            try {
                const response = await fetchWithAuth(`${apiEndpoint}/shared-quiz/${code}/status`)
                if (response.ok) {
                    const sessionData = await response.json()
                    setSessionStatus(sessionData.status)
                    setPlayers(sessionData.players)
                    setCurrentQuestionIndex(sessionData.currentQuestionIndex)
                    return sessionData
                } else {
                    throw new Error("Failed to fetch session data")
                }
            } catch (err) {
                setError("Failed to load session data")
                console.error(err)
                return null
            }
        }

        const fetchQuizData = async (sessionData) => {
            if (!sessionData) return

            try {
                const response = await fetchWithAuth(`${apiEndpoint}/internal/quizdata/${code}`)
                if (response.ok) {
                    const quizData = await response.json()
                    setQuiz(quizData)
                } else {
                    throw new Error("Failed to fetch quiz data")
                }
            } catch (err) {
                setError("Failed to load quiz data")
                console.error(err)
            }
        }

        const initializeSocket = (hostId) => {
            if (!hostId) return

            // Connect to socket server
            const newSocket = io(apiEndpoint)

            newSocket.on("connect", () => {
                console.log("Socket connected")

                // Join as host
                newSocket.emit("host-session", { code, hostId })
            })

            newSocket.on("hosting-session", (data) => {
                setSessionStatus(data.status)
                setPlayers(data.players)
                setCurrentQuestionIndex(data.currentQuestionIndex)
            })

            newSocket.on("player-joined", (data) => {
                setPlayers((prevPlayers) => [
                    ...prevPlayers,
                    {
                        id: data.playerId,
                        username: data.username,
                        isGuest: data.isGuest,
                        score: 0,
                    },
                ])
            })

            newSocket.on("player-left", (data) => {
                setPlayers((prevPlayers) => prevPlayers.filter((player) => player.id !== data.playerId))
            })

            newSocket.on("answer-submitted", (data) => {
                setPlayers((prevPlayers) =>
                    prevPlayers.map((player) => (player.id === data.playerId ? { ...player, score: data.score } : player)),
                )
            })

            newSocket.on("error", (data) => {
                setError(data.message)
            })

            setSocket(newSocket)

            return newSocket
        }

        const setup = async () => {
            setIsLoading(true)
            try {
                const userId = await fetchUserData()
                if (userId) {
                    const sessionData = await fetchSessionData(userId)
                    await fetchQuizData(sessionData)
                    const newSocket = initializeSocket(userId)

                    return () => {
                        if (newSocket) newSocket.disconnect()
                    }
                }
            } finally {
                setIsLoading(false)
            }
        }

        const cleanup = setup()
        return () => {
            if (cleanup && typeof cleanup === "function") {
                cleanup()
            }
        }
    }, [code])

    const handleStartQuiz = async () => {
        if (players.length === 0) {
            setError("Cannot start quiz with no players")
            return
        }

        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/start?hostId=${hostId}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to start quiz")
            }

            const data = await response.json()
            setSessionStatus(data.status)
            setCurrentQuestionIndex(data.currentQuestionIndex)
        } catch (err) {
            setError(err.message || "Failed to start quiz")
            console.error(err)
        }
    }

    const handleNextQuestion = async () => {
        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/next?hostId=${hostId}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to move to next question")
            }

            const data = await response.json()
            setCurrentQuestionIndex(data.currentQuestionIndex)

            // Check if we've reached the end of the quiz
            if (quiz && data.currentQuestionIndex >= quiz.questions.length) {
                await handleEndQuiz()
            }
        } catch (err) {
            setError(err.message || "Failed to move to next question")
            console.error(err)
        }
    }

    const handleEndQuiz = async () => {
        try {
            const response = await fetchWithAuth(`/shared-quiz/${code}/end?hostId=${hostId}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to end quiz")
            }

            const data = await response.json()
            setSessionStatus(data.status)
            setPlayers(data.players)
        } catch (err) {
            setError(err.message || "Failed to end quiz")
            console.error(err)
        }
    }

    const getCurrentQuestion = () => {
        if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
            return null
        }

        return quiz.questions[currentQuestionIndex]
    }

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
                                    <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">Guest</span>
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
    )

    const renderActiveQuiz = () => {
        const currentQuestion = getCurrentQuestion()

        return (
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">
                        Question {currentQuestionIndex + 1} of {quiz?.questions.length}
                    </h2>

                    {currentQuestion && (
                        <div className="bg-gray-100 p-4 rounded mb-4">
                            <p className="text-lg font-medium mb-2">{currentQuestion.question}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                {currentQuestion.options.map((option, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded border ${
                                            currentQuestion.correctOptionIndex === index
                                                ? "bg-green-100 border-green-500"
                                                : "bg-white border-gray-300"
                                        }`}
                                    >
                                        <span className="font-medium">{option}</span>
                                        {currentQuestion.correctOptionIndex === index && <span className="ml-2 text-green-600">✓</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
                                                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">Guest</span>
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
                    {currentQuestionIndex + 1 < quiz?.questions.length ? "Next Question" : "End Quiz"}
                </button>
            </div>
        )
    }

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
                                            <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">Guest</span>
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
    )

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-xl">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Quiz Host - {code}</h1>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            {sessionStatus === "waiting" && renderWaitingRoom()}
            {sessionStatus === "active" && renderActiveQuiz()}
            {sessionStatus === "finished" && renderFinishedQuiz()}
        </div>
    )
}
