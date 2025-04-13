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

    const mockCategories = ["History"];

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
});
