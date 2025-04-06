import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StatsTab from "../components/home/ui/StatsTab";
import { fetchWithAuth } from "@/utils/api-fetch-auth";

// Mock the necessary modules
jest.mock("@/utils/api-fetch-auth");
jest.mock("../components/home/data", () => ({
    quizCategories: [
        { id: 1, name: "History", icon: "🏛️", color: "#FF5733" }
    ]
}));
describe("StatsTab Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("renders the StatsTab component correctly", async () => {
        fetchWithAuth.mockResolvedValueOnce({
            stats: {
                totalGames: 10,
                successRatio: 0.75,
                avgScore: 80,
                avgTime: 30,
                totalScore: 800,
                totalCorrectAnswers: 60,
                totalQuestions: 80
            }
        });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Quiz Statistics")).toBeInTheDocument();
            expect(screen.getByText("Based on 10 completed quizzes")).toBeInTheDocument();
        });
    });

    test("handles loading state correctly", () => {
        fetchWithAuth.mockReturnValue(new Promise(() => {}));

        render(<StatsTab />);

        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("displays statistics correctly in Overview tab", async () => {
        fetchWithAuth.mockResolvedValueOnce({
            stats: {
                totalGames: 10,
                successRatio: 0.75,
                avgScore: 80,
                avgTime: 30,
                totalScore: 800,
                totalCorrectAnswers: 60,
                totalQuestions: 80
            }
        });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Based on 10 completed quizzes")).toBeInTheDocument();
        });

        const chartContainer = screen.getByText("Quiz Statistics").closest("div");
        expect(chartContainer).toBeInTheDocument();

        expect(screen.getByText("Quiz Statistics")).toBeInTheDocument();
        expect(screen.getByText("Total Games")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("Avg Score per Quiz")).toBeInTheDocument();
        expect(screen.getByText("80.0 points")).toBeInTheDocument();
        expect(screen.getByText("Total Score")).toBeInTheDocument();
        expect(screen.getByText("800 points")).toBeInTheDocument();
        expect(screen.getByText("Correct Answers")).toBeInTheDocument();
        expect(screen.getByText("60")).toBeInTheDocument();
        expect(screen.getByText("Total Questions")).toBeInTheDocument();
        expect(screen.getByText("80")).toBeInTheDocument();
        expect(screen.getByText("Accuracy")).toBeInTheDocument();
        expect(screen.getByText("75.0%")).toBeInTheDocument();
        expect(screen.getByText("Avg Time per Quiz")).toBeInTheDocument();
        expect(screen.getByText("30.0 s")).toBeInTheDocument();
    });

    test("filters statistics by subject", async () => {
        fetchWithAuth.mockResolvedValueOnce({
            stats: {
                totalGames: 10,
                successRatio: 0.75,
                avgScore: 80,
                avgTime: 30,
                totalScore: 800,
                totalCorrectAnswers: 60,
                totalQuestions: 80
            }
        });

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByLabelText(/filter by subject/i)).toBeInTheDocument();
        });

        const selectElement = screen.getByRole('combobox', { name: /filter by subject/i });
        fireEvent.mouseDown(selectElement);

        await waitFor(() => {
            const listbox = screen.getByRole('listbox');
            expect(listbox).toBeInTheDocument();
        });

        const historyOption = screen.getByRole('option', { name: /history/i });
        fireEvent.click(historyOption);

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith("/statistics/subject/history");
        });
    });
});