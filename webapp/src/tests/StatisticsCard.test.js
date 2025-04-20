import React, { act } from "react";
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
            successRatio: 0.85
        }
    };

    const mockLeaderboardData = {
        leaderboard: [
            { _id: "player1", rank: 3 }
        ]
    };

    beforeEach(async () => {
        await act(async () => {
            jest.resetAllMocks();
            getAuthToken.mockReturnValue("fake-token");
            getCurrentPlayerId.mockResolvedValue("player1");
        });

    });

    it("renders statistics with correct data and formatting", async () => {
        await act(async () => {
            fetchWithAuth
                .mockResolvedValueOnce(mockStatsData)
                .mockResolvedValueOnce(mockLeaderboardData);

            render(<StatisticsCard/>);
        })
        await waitFor(() => {
            expect(screen.getByText("10")).toBeInTheDocument();
            expect(screen.getByText("85%")).toBeInTheDocument();
            expect(screen.getByText("#3")).toBeInTheDocument();
        });
    });

    it("displays error message when API call fails", async () => {
        await act(async () => {
            fetchWithAuth.mockRejectedValue(new Error("Failed to fetch"));
            render(<StatisticsCard/>);
        });
        await waitFor(() => {
            expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
        });
    });

    it("displays correct statistic labels", async () => {
        await act(async () => {
            fetchWithAuth
                .mockResolvedValueOnce(mockStatsData)
                .mockResolvedValueOnce(mockLeaderboardData);

            render(<StatisticsCard/>);
        });
        await waitFor(() => {
            expect(screen.getByText("Quizzes")).toBeInTheDocument();
            expect(screen.getByText("Accuracy")).toBeInTheDocument();
            expect(screen.getByText("Rank")).toBeInTheDocument();
        });
    });

    it("handles missing player in leaderboard gracefully", async () => {
        getCurrentPlayerId.mockResolvedValue("player1");

        fetchWithAuth
            .mockResolvedValueOnce(mockStatsData)
            .mockResolvedValueOnce({
                leaderboard: [{ _id: "player2", rank: 3 }]
            });

        render(<StatisticsCard/>);
        await waitFor(() => {
            expect(screen.getByText("#N/A")).toBeInTheDocument();
        });
    });

    it("formats numbers correctly", async () => {
        const data = {
            stats: {
                successRatio: 1
            }
        };
        await act(async () => {
            fetchWithAuth
                .mockResolvedValueOnce(data)
                .mockResolvedValueOnce(mockLeaderboardData);

            render(<StatisticsCard/>);
        });
        await waitFor(() => {
            expect(screen.getByText("100%")).toBeInTheDocument();
        });
    });
});