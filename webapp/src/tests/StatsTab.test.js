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

    test("handles error state correctly", async () => {
        fetchWithAuth.mockRejectedValueOnce(new Error("Failed to fetch"));

        render(<StatsTab />);

        await waitFor(() => {
            expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
        });
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

        expect(screen.getByRole("tab", { name: "Overview", selected: true })).toBeInTheDocument();
        expect(screen.getByRole("tabpanel")).toBeInTheDocument();

        const chartContainer = screen.getByText("Global Statistics").closest("div");
        expect(chartContainer).toBeInTheDocument();

        expect(screen.queryByText("Total Games")).not.toBeInTheDocument();
        expect(screen.getByText("Global Statistics")).toBeInTheDocument();
    });

    test("displays statistics correctly in Detailed Stats tab", async () => {
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
            fireEvent.click(screen.getByText("Detailed Stats"));
            expect(screen.getByText("Total Games")).toBeInTheDocument();
            expect(screen.getByText("10")).toBeInTheDocument();
            expect(screen.getByText("Avg Score")).toBeInTheDocument();
            expect(screen.getByText("80.0%")).toBeInTheDocument();
            expect(screen.getByText("Total Score")).toBeInTheDocument();
            expect(screen.getByText("800")).toBeInTheDocument();
            expect(screen.getByText("Correct Answers")).toBeInTheDocument();
            expect(screen.getByText("60")).toBeInTheDocument();
            expect(screen.getByText("Total Questions")).toBeInTheDocument();
            expect(screen.getByText("80")).toBeInTheDocument();
            expect(screen.getByText("Success Ratio")).toBeInTheDocument();
            expect(screen.getByText("75.0%")).toBeInTheDocument();
            expect(screen.getByText("Avg Time per Quiz")).toBeInTheDocument();
            expect(screen.getByText("30.0s")).toBeInTheDocument();
        });
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