"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { fetchWithAuth } from "../../utils/api-fetch-auth"

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

export default function CreateGame() {
    const [topics, setTopics] = useState([])
    const [selectedTopic, setSelectedTopic] = useState("")
    const [numberOfQuestions, setNumberOfQuestions] = useState(5)
    const [numberOfAnswers, setNumberOfAnswers] = useState(4)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        // Fetch available topics
        const fetchTopics = async () => {
            try {
                const response = await fetch(`${apiEndpoint}/quiz/allTopics`,{
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
                if (response.ok) {
                    const data = await response.json()
                    setTopics(data)
                    if (data.length > 0) {
                        setSelectedTopic(data[0])
                    }
                } else {
                    setError("Failed to fetch topics")
                }
            } catch (err) {
                setError("Error fetching topics")
                console.error(err)
            }
        }

        fetchTopics()
    }, [])

    const handleCreateQuiz = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // First, create a quiz
            const quizResponse = await fetchWithAuth(`${apiEndpoint}/game/${selectedTopic}/${numberOfQuestions}/${numberOfAnswers}`)

            if (!quizResponse.ok) {
                throw new Error("Failed to create quiz")
            }

            const quizData = await quizResponse.json()

            // Get user info from token
            const userResponse = await fetchWithAuth("/token/username")
            if (!userResponse.ok) {
                throw new Error("Failed to get user info")
            }

            const userData = await userResponse.json()
            const hostId = userData.id
            const hostUsername = userData.username

            // Create a shared quiz session
            const sessionResponse = await fetchWithAuth("/shared-quiz/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    quizData,
                    hostId,
                    hostUsername,
                }),
            })

            if (!sessionResponse.ok) {
                throw new Error("Failed to create shared quiz session")
            }

            const sessionData = await sessionResponse.json()

            // Redirect to host manager page
            router.push(`/wihoot/host/${sessionData.code}/manager`)
        } catch (err) {
            setError(err.message || "Failed to create shared quiz")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Create a Shared Quiz</h1>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            <form onSubmit={handleCreateQuiz} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="topic">
                        Topic
                    </label>
                    <select
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    >
                        <option value="" disabled>
                            Select a topic
                        </option>
                        {topics.map((topic) => (
                            <option key={topic} value={topic}>
                                {topic}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="questions">
                        Number of Questions
                    </label>
                    <input
                        id="questions"
                        type="number"
                        min="1"
                        max="20"
                        value={numberOfQuestions}
                        onChange={(e) => setNumberOfQuestions(Number.parseInt(e.target.value))}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="questions">
                        Number of Answers
                    </label>
                    <input
                        id="answers"
                        type="number"
                        min="4"
                        max="6"
                        value={numberOfAnswers}
                        onChange={(e) => setNumberOfAnswers(Number.parseInt(e.target.value))}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    />
                </div>

                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                    >
                        {isLoading ? "Creating..." : "Create Shared Quiz"}
                    </button>
                </div>
            </form>

            <p className="text-center text-gray-500 text-xs">Create a quiz and share it with friends using a unique
                code.</p>
        </div>
    )
}
