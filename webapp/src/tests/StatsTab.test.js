import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StatsTab from "../components/home/ui/StatsTab";
import { fetchWithAuth } from "@/utils/api-fetch-auth";

jest.mock("@/utils/api-fetch-auth");

// Mock the fetch for /quiz/llTopics
global.fetch = jest.fn();

describe("StatsTab Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockStats = {
        stats: {
            totalGames: 10,
            successRatio: 0.75,
            avgScore: 80,
            avgTime: 30,
            totalScore: 800,
            totalCorrectAnswers: 60,
            totalQuestions: 80
        }
    };

    const mockRecentQuizzes = {
        recentQuizzes: [
            {
                subject: "History",
                points_gain: 100,
                number_of_questions: 10,
                number_correct_answers: 8,
                total_time: 45.5
            },
            {
                subject: "Math",
                points_gain: 69,
                number_of_questions: 10,
                number_correct_answers: 6,
                total_time: 50.2
            }
        ],
        hasMoreQuizzes: true
    };

    const mockCategories = ["History", "Math"];

    test("renders the StatsTab component correctly", async () => {
        fetchWithAuth.mockResolvedValueOnce(mockStats);
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockCategories)
        });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Quiz Statistics")).toBeInTheDocument();
            expect(screen.getByText("Based on 10 completed quizzes")).toBeInTheDocument();
        });
    });

    test("handles loading state correctly", () => {
        fetchWithAuth.mockReturnValue(new Promise(() => {}));
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockCategories)
        });

        render(<StatsTab />);
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("displays statistics correctly in Overview tab", async () => {
        fetchWithAuth.mockResolvedValueOnce(mockStats);
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockCategories)
        });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Total Games")).toBeInTheDocument();
            expect(screen.getByText("10")).toBeInTheDocument();
            expect(screen.getByText("80.0 points")).toBeInTheDocument();
            expect(screen.getByText("800 points")).toBeInTheDocument();
            expect(screen.getByText("60")).toBeInTheDocument();
            expect(screen.getByText("80")).toBeInTheDocument();
            expect(screen.getByText("75.0%")).toBeInTheDocument();
            expect(screen.getByText("30.0 s")).toBeInTheDocument();
        });
    });

    test("filters statistics by subject", async () => {
        fetchWithAuth.mockResolvedValueOnce(mockStats); // For initial load (/statistics/global)
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockCategories)
        });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByLabelText(/filter by subject/i)).toBeInTheDocument();
        });

        // Trigger subject filter dropdown
        const selectElement = screen.getByRole("combobox", { name: /filter by subject/i });
        fireEvent.mouseDown(selectElement);

        await waitFor(() => {
            expect(screen.getByRole("listbox")).toBeInTheDocument();
        });

        const historyOption = screen.getByRole("option", { name: /history/i });
        fireEvent.click(historyOption);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith("/statistics/subject/history");
        });
    });

    test("displays recent quizzes correctly", async () => {

        fetchWithAuth
            .mockResolvedValueOnce(mockStats)
            .mockResolvedValueOnce(mockRecentQuizzes)
            .mockResolvedValueOnce(mockCategories);

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Recent Quizzes")).toBeInTheDocument();
            expect(screen.getByText("History")).toBeInTheDocument();
            expect(screen.getByText("Math")).toBeInTheDocument();
            expect(screen.getByText("100")).toBeInTheDocument();
            expect(screen.getByText("69")).toBeInTheDocument();
        });
    });

    test("loads more recent quizzes when button is clicked", async () => {
        const secondPageQuizzes = {
            recentQuizzes: [
                {
                    subject: "Art",
                    points_gain: 90,
                    number_of_questions: 10,
                    number_correct_answers: 7,
                    total_time: 40.0,
                },
            ],
            hasMoreQuizzes: false,
        }
        fetchWithAuth.mockReset()
        fetch.mockReset()

        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockCategories),
        })

        fetchWithAuth.mockImplementation((endpoint) => {
            if (endpoint === "/statistics/global") {
                return Promise.resolve(mockStats)
            } else if (endpoint === "/statistics/recent-quizzes?page=0") {
                return Promise.resolve(mockRecentQuizzes)
            } else if (endpoint === "/statistics/recent-quizzes?page=1") {
                return Promise.resolve(secondPageQuizzes)
            }
            return Promise.resolve({})
        })

        render(<StatsTab />)

        await waitFor(() => {
            const baseText = screen.getByText(/Based on.*completed quizzes/i)
            expect(baseText).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("History")).toBeInTheDocument()
            expect(screen.getByText("Math")).toBeInTheDocument()
        })

        const loadMoreButton = await screen.findByText("Load more")
        expect(loadMoreButton).toBeInTheDocument()

        fireEvent.click(loadMoreButton)

        await waitFor(() => {
            expect(screen.getByText("Art")).toBeInTheDocument()
        })
    });

    test("display correctly the graphs when there's statistics", async () => {
        fetchWithAuth.mockResolvedValueOnce(mockStats);
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockCategories)
        });
        fetch.mockResolvedValueOnce({
            json: () => Promise.resolve(mockRecentQuizzes)
        });
        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Answer Distribution")).toBeInTheDocument();
            expect(screen.getByText("Overall Accuracy")).toBeInTheDocument();
        });
    });

    test("manages correctly the lack of statistics", async () => {
        fetchWithAuth.mockReset();
        fetchWithAuth.mockResolvedValueOnce({ stats: null });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("You have not played any quizzes on this category yet.")).toBeInTheDocument();
        });
    });

    test("sets correctly performace colours", async () => {

        const quizzes = {
            recentQuizzes: [
                {
                    subject: "High Score",
                    points_gain: 100,
                    number_of_questions: 10,
                    number_correct_answers: 9, // 90% - verde
                    total_time: 30.0
                },
                {
                    subject: "Medium Score",
                    points_gain: 60,
                    number_of_questions: 10,
                    number_correct_answers: 5, // 50% - amarillo
                    total_time: 30.0
                },
                {
                    subject: "Low Score",
                    points_gain: 20,
                    number_of_questions: 10,
                    number_correct_answers: 2, // 20% - rojo
                    total_time: 30.0
                }
            ],
            hasMoreQuizzes: false
        };
        fetchWithAuth
            .mockResolvedValueOnce(mockStats)
            .mockResolvedValueOnce(quizzes);

        render(<StatsTab />);

        await waitFor(() => {
            const highScoreRow = screen.getByText("High Score").closest("tr");
            expect(highScoreRow).toHaveStyle({ borderLeft: "4px solid #4caf50" }); // Green

            const mediumScoreRow = screen.getByText("Medium Score").closest("tr");
            expect(mediumScoreRow).toHaveStyle({ borderLeft: "4px solid #f5a623" }); // Orange

            const lowScoreRow = screen.getByText("Low Score").closest("tr");
            expect(lowScoreRow).toHaveStyle({ borderLeft: "4px solid #e6296f" }); // Red
        });
    });


});
