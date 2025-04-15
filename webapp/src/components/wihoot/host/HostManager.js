"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import io from "socket.io-client"
import ResultsLeaderboard from '@/components/wihoot/game/ResultsLeaderboard'

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function HostGame({ time, questions, code }) {
    const router = useRouter()

    const [socket, setSocket] = useState(null)
    const [session, setSession] = useState(null)

    const [players, setPlayers] = useState([])

    const [currentQuestion, setCurrentQuestion] = useState(null)
    const [questionIndex, setQuestionIndex] = useState(-1) // -1 means lobby

    const [timer, setTimer] = useState(time)
    const [gameState, setGameState] = useState("lobby") // lobby, question, results, final
    const [questionResults, setQuestionResults] = useState(null)
    const [finalResults, setFinalResults] = useState(null)

    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    // Initialize socket and fetch session data
    useEffect(() => {
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

        if (!token) {
            console.error("No token found, redirecting to login")
            router.push("/login")
            return
        }

        // Initialize socket
        const newSocket = io(gatewayUrl, {
            path: '/socket.io',   // Use the proxy path
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        setSocket(newSocket)

        // Socket cleanup
        return () => {
            if (newSocket) newSocket.disconnect()
        }
    }, [code, router])

    // Set up socket event listeners
    useEffect(() => {
        if (!socket) return

        // Join the host to the game room
        socket.emit("host-join-game", code)

        // Update players list
        socket.on("update-players", (updatedPlayers) => {
            console.log("Players updated:", updatedPlayers)
            setPlayers(updatedPlayers)
        })

        // Player joined event
        socket.on("player-joined", (playerData) => {
            console.log("Player joined:", playerData)
            // The full player list will be sent via update-players event
        })

        // Player left event
        socket.on("player-left", (playerData) => {
            console.log("Player left:", playerData)
            // The full player list will be sent via update-players event
        })

        // Game started event
        socket.on("game-started", () => {
            console.log("Game started")
            setGameState("lobby")
        })

        // Question started event
        socket.on("question-started", (questionData) => {
            console.log("Question started:", questionData)
            setCurrentQuestion(questionData)
            setQuestionIndex(questionData.questionIndex)
            setGameState("question")
        })

        // Question results event
        socket.on("question-ended", (resultsData) => {
            console.log("Question ended:", resultsData)
            setQuestionResults(resultsData)
            setGameState("results")
        })

        // Game ended event
        socket.on("game-ended", (results) => {
            console.log("Game ended:", results)
            setFinalResults(results)
            setGameState("final")
            socket.emit("end-game", code)
        })

        // Timer update event
        socket.on("timer-update", (timeLeft) => {
            setTimer(timeLeft)
        })

        // Error handling
        socket.on("error", (errorMsg) => {
            console.error("Socket error:", errorMsg)
            setError(errorMsg)
        })

        return () => {
            socket.off("update-players")
            socket.off("player-joined")
            socket.off("player-left")
            socket.off("game-started")
            socket.off("question-started")
            socket.off("question-ended")
            socket.off("game-ended")
            socket.off("timer-update")
            socket.off("error")
        }
    }, [socket, code])

    const startGame = () => {
        if (players.length === 0) {
            setError("You need at least one player to start the game")
            return
        }

        console.log("Starting game:", code)
        socket.emit("start-game", code)
    }

    const nextQuestion = () => {
        console.log("Next question for game:", code)
        socket.emit("next-question", code)
    }

    const skipTimer = () => {
        console.log("Skipping timer for game:", code)
        socket.emit("skip-timer", code)
    }

    const endGame = () => {
        console.log("Ending game:", code)
        socket.emit("end-game", code)
    }

    if (loading) {
        return <div className="loading">Loading game session...</div>
    }

    if (!session) {
        return (
            <div className="host-container">
                <div className="error">Session not found or has expired</div>
                <Link href="/dashboard">
                    <button>Back to Dashboard</button>
                </Link>
            </div>
        )
    }

    return (
        <div className="host-container">
            <div className="header">
                <h1>Game: {session.quizId?.title}</h1>
                <div className="game-code">
                    <h2>
                        Game Code: <span>{code}</span>
                    </h2>
                    <p>Share this code with players to join</p>
                </div>
            </div>

            {error && <div className="error">{error}</div>}

            {gameState === "lobby" && (
                <div className="lobby">
                    <h2>Waiting for players to join...</h2>
                    <p>Players: {players.length}</p>

                    <div className="player-list">
                        {players.map((player) => (
                            <div key={player.id} className="player-item">
                                {player.name}
                            </div>
                        ))}
                    </div>

                    {players.length === 0 && <p>No players have joined yet. Share the game code to get started.</p>}

                    <div className="actions">
                        <button onClick={startGame} disabled={players.length === 0}>
                            Start Game
                        </button>
                        <button onClick={endGame} className="danger">
                            Cancel Game
                        </button>
                    </div>
                </div>
            )}

            {gameState === "question" && currentQuestion && ( //TODO mofidicar esto para hacer match con el formato de questions/currentQuestion
                <div className="question">
                    <div className="question-header">
                        <h2>
                            Question {questionIndex + 1} of {session.quizId?.questions.length}
                        </h2>
                        <div className="timer">{timer}</div>
                    </div>

                    <h3>{currentQuestion.text}</h3>

                    <div className="answer-options">
                        {currentQuestion.answers.map((answer, index) => (
                            <div
                                key={index}
                                className={`answer-option ${index === 0 ? "red" : index === 1 ? "blue" : index === 2 ? "green" : "yellow"} ${answer.isCorrect ? "correct" : ""}`}
                            >
                                {answer.text}
                                {answer.isCorrect && <span className="correct-marker">✓</span>}
                            </div>
                        ))}
                    </div>

                    <div className="actions">
                        <button onClick={skipTimer} className="secondary">
                            Skip Timer
                        </button>
                    </div>
                </div>
            )}

            {gameState === "results" && questionResults && (
                <div className="results">
                    <ResultsLeaderboard />
                    <button onClick={nextQuestion} className="primary">
                        {questionIndex + 1 < session.quizId?.questions.length ? "Next Question" : "Show Final Results"}
                    </button>
                </div>
            )}

            {gameState === "final" && finalResults && (
                <div className="final-results">
                    <h2>Final Results</h2>

                    <ResultsLeaderboard />

                    <div className="actions">
                        <button onClick={endGame} className="primary">
                            End Game & Return to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
