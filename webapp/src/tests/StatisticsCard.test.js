import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import StatisticsCard from "../components/home/ui/StatisticsCard";
import { fetchWithAuth } from "@/utils/api-fetch-auth";
import { getAuthToken, getCurrentPlayerId } from "@/utils/auth";

jest.mock("../utils/api-fetch-auth");
jest.mock("../utils/auth");

describe("StatisticsCard Component", () => {
    const mockStatsData = {
        stats: {
            totalGames: 10,
            successRatio: 0.855
        }
    };

    const mockLeaderboardData = {
        leaderboard: [
            { _id: "player1", rank: 3 }
        ]
    };

    beforeEach(() => {
        fetchWithAuth.mockClear();
        getAuthToken.mockReturnValue("fake-token");
        getCurrentPlayerId.mockResolvedValue("player1");
    });

    it("renders loading state initially", () => {
        fetchWithAuth.mockImplementation(() => new Promise(() => {}));
        render(<StatisticsCard  stats={}/>);
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("renders statistics with correct data and formatting", async () => {
        fetchWithAuth
            .mockResolvedValueOnce(mockStatsData)
            .mockResolvedValueOnce(mockLeaderboardData);

        render(<StatisticsCard  stats={}/>);

        await waitFor(() => {
            expect(screen.getByText("10")).toBeInTheDocument();
            expect(screen.getByText("85.5%")).toBeInTheDocument();
            expect(screen.getByText("#3")).toBeInTheDocument();
        });
    });

    it("displays error message when API call fails", async () => {
        fetchWithAuth.mockRejectedValue(new Error("Failed to fetch"));
        render(<StatisticsCard  stats={}/>);

        await waitFor(() => {
            expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
        });
    });

    it("displays correct statistic labels", async () => {
        fetchWithAuth
            .mockResolvedValueOnce(mockStatsData)
            .mockResolvedValueOnce(mockLeaderboardData);

        render(<StatisticsCard  stats={}/>);

        await waitFor(() => {
            expect(screen.getByText("Quizzes")).toBeInTheDocument();
            expect(screen.getByText("Accuracy")).toBeInTheDocument();
            expect(screen.getByText("Rank")).toBeInTheDocument();
        });
    });

    it("handles missing leaderboard data gracefully", async () => {
        fetchWithAuth
            .mockResolvedValueOnce(mockStatsData)
            .mockResolvedValueOnce({ leaderboard: [] });

        render(<StatisticsCard  stats={}/>);

        await waitFor(() => {
            expect(screen.getByText("N/A")).toBeInTheDocument();
        });
    });

    it("formats numbers correctly", async () => {
        const data = {
            stats: {
                totalGames: 1000,
                successRatio: 1
            }
        };

        fetchWithAuth
            .mockResolvedValueOnce(data)
            .mockResolvedValueOnce(mockLeaderboardData);

        render(<StatisticsCard  stats={}/>);

        await waitFor(() => {
            expect(screen.getByText("1000")).toBeInTheDocument();
            expect(screen.getByText("100%")).toBeInTheDocument();
        });
    });
});