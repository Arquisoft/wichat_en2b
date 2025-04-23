"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { fetchWithAuth } from "../../../utils/api-fetch-auth"
import io from "socket.io-client"

export default function PlayerView() {
    const router = useRouter()
    const { code, playerId } = router.query

    const [socket, setSocket] = useState(null)
    const [username, setUsername] = useState("")
    const [isGuest, setIsGuest] = useState(false)
    const [sessionStatus, setSessionStatus] = useState("waiting")
    const [players, setPlayers] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
    const [quiz, setQuiz] = useState(null)
    const [selectedOption, setSelectedOption] = useState(null)
    const [hasAnswered, setHasAnswered] = useState(false)
    const [startTime, setStartTime] = useState(null)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    // Initialize socket connection and fetch session data
    useEffect(() => {
        if (!code || !playerId) return

        const fetchUserData = async () => {
            if (playerId.startsWith("guest_")) {
                // For guest users, we don't need to fetch user data
                setIsGuest(true)
                return
            }

            try {
                const response = await fetchWithAuth("/token/username")
                if (response.ok) {
                    const userData = await response.json()
                    setUsername(userData.username)
                    return userData
                } else {
                    throw new Error("Failed to get user data")
                }
            } catch (err) {
                setError("Authentication error. Please log in again.")
                console.error(err)
                return null
            }
        }

        const fetchSessionData = async () => {
            try {
                const response = await fetchWithAuth(`/shared-quiz/${code}/status`)
                if (response.ok) {
                    const sessionData = await response.json()
                    setSessionStatus(sessionData.status)
                    setPlayers(sessionData.players)
                    setCurrentQuestionIndex(sessionData.currentQuestionIndex)

                    // Find player in the session
                    const player = sessionData.players.find((p) => p.id === playerId)
                    if (player) {
                        setUsername(player.username)
                        setIsGuest(player.isGuest)
                    }

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
            if (!sessionData || !sessionData.quizId) return

            try {
                const response = await fetchWithAuth(`/quiz?id=${sessionData.quizId}`)
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

        const initializeSocket = () => {
            // Connect to socket server
            const newSocket = io(process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || "http://localhost:8000")

            newSocket.on("connect", () => {
                console.log("Socket connected")

                // Join as player
                newSocket.emit("join-session", {
                    code,
                    playerId,
                    username,
                    isGuest,
                })
            })

            newSocket.on("joined-session", (data) => {
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

            newSocket.on("session-started", (data) => {
                setSessionStatus("active")
                setCurrentQuestionIndex(data.currentQuestionIndex)
                setStartTime(Date.now())
                setHasAnswered(false)
                setSelectedOption(null)
            })

            newSocket.on("question-changed", (data) => {
                setCurrentQuestionIndex(data.currentQuestionIndex)
                setStartTime(Date.now())
                setHasAnswered(false)
                setSelectedOption(null)
            })

            newSocket.on("session-ended", (data) => {
                setSessionStatus("finished")
                setPlayers(data.players)
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
                await fetchUserData()
                const sessionData = await fetchSessionData()
                await fetchQuizData(sessionData)
                const newSocket = initializeSocket()

                return () => {
                    if (newSocket) newSocket.disconnect()
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
    }, [code, playerId, username, isGuest])

    const getCurrentQuestion = () => {
        if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
            return null
        }

        return quiz.questions[currentQuestionIndex]
    }

    const handleAnswerSubmit = async (optionIndex) => {
        if (hasAnswered) return

        const currentQuestion = getCurrentQuestion()
        if (!currentQuestion) return

        setSelectedOption(optionIndex)
        setHasAnswered(true)

        const timeToAnswer = Date.now() - startTime
        const isCorrect = optionIndex === currentQuestion.correctOptionIndex

        try {
            await fetchWithAuth(`/shared-quiz/${code}/answer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    playerId,
                    questionId: currentQuestion.id,
                    answerId: optionIndex,
                    isCorrect,
                    timeToAnswer,
                }),
            })
        } catch (err) {
            console.error("Failed to submit answer:", err)
        }
    }

    const renderWaitingRoom = () => (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h2 className="text-2xl font-bold mb-4">Waiting for host to start</h2>

            <div className="mb-6">
                <p className="text-lg mb-2">You've joined with code:</p>
                <div className="bg-gray-100 p-4 text-center text-3xl font-bold tracking-wider">{code}</div>
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Players ({players.length})</h3>
                <ul className="bg-gray-100 p-4 rounded">
                    {players.map((player) => (
                        <li key={player.id} className="mb-2 flex items-center">
                            <span className="font-medium">{player.username}</span>
                            {player.isGuest && (
                                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">Guest</span>
                            )}
                            {player.id === playerId && (
                                <span className="ml-2 bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded">You</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-center text-gray-500">The host will start the quiz soon. Get ready!</p>
        </div>
    )

    const renderActiveQuiz = () => {
        const currentQuestion = getCurrentQuestion()
        const player = players.find((p) => p.id === playerId)

        if (!currentQuestion) {
            return (
                <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                    <p className="text-center text-xl">Loading question...</p>
                </div>
            )
        }

        return (
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Question {currentQuestionIndex + 1}</h2>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Your Score</p>
                            <p className="text-xl font-bold">{player?.score || 0}</p>
                        </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded mb-6">
                        <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSubmit(index)}
                                disabled={hasAnswered}
                                className={`p-4 rounded text-left transition-colors ${
                                    hasAnswered && selectedOption === index
                                        ? selectedOption === currentQuestion.correctOptionIndex
                                            ? "bg-green-100 border-green-500 border-2"
                                            : "bg-red-100 border-red-500 border-2"
                                        : hasAnswered && index === currentQuestion.correctOptionIndex
                                            ? "bg-green-100 border-green-500 border-2"
                                            : hasAnswered
                                                ? "bg-gray-100 border-gray-300 border opacity-70"
                                                : "bg-white border-gray-300 border hover:bg-gray-50"
                                }`}
                            >
                                <span className="font-medium">{option}</span>
                                {hasAnswered && index === currentQuestion.correctOptionIndex && (
                                    <span className="ml-2 text-green-600">✓</span>
                                )}
                                {hasAnswered && selectedOption === index && index !== currentQuestion.correctOptionIndex && (
                                    <span className="ml-2 text-red-600">✗</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {hasAnswered && (
                    <div className="text-center">
                        <p className="text-lg">
                            {selectedOption === currentQuestion.correctOptionIndex
                                ? "✅ Correct! Well done!"
                                : "❌ Incorrect. Better luck on the next question!"}
                        </p>
                        <p className="text-gray-500 mt-2">Waiting for the host to move to the next question...</p>
                    </div>
                )}
            </div>
        )
    }

    const renderFinishedQuiz = () => (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h2 className="text-2xl font-bold mb-4">Quiz Completed</h2>

            <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">Final Results</h3>
                <ul className="bg-gray-100 p-4 rounded">
                    {[...players]
                        .sort((a, b) => b.score - a.score)
                        .map((player, index) => (
                            <li
                                key={player.id}
                                className={`mb-2 flex justify-between items-center p-2 rounded ${
                                    player.id === playerId ? "bg-blue-50" : ""
                                }`}
                            >
                                <div>
                                    <span className="font-bold mr-2">#{index + 1}</span>
                                    <span className="font-medium">{player.username}</span>
                                    {player.isGuest && (
                                        <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">Guest</span>
                                    )}
                                    {player.id === playerId && (
                                        <span className="ml-2 bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded">You</span>
                                    )}
                                </div>
                                <span className="font-bold">{player.score}</span>
                            </li>
                        ))}
                </ul>
            </div>

            <button
                onClick={() => router.push("/shared-quiz/join")}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
                Join Another Quiz
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
            <h1 className="text-3xl font-bold mb-6">Quiz Player - {username}</h1>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            {sessionStatus === "waiting" && renderWaitingRoom()}
            {sessionStatus === "active" && renderActiveQuiz()}
            {sessionStatus === "finished" && renderFinishedQuiz()}
        </div>
    )
}
