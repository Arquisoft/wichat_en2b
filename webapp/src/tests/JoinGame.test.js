import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import JoinGame from "../components/wihoot/JoinGame";
import fetchMock from "jest-fetch-mock";
import mockRouter from "next-router-mock";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";
import axios from "axios";

// Enable fetch mocking
fetchMock.enableMocks();

// Mock next/router (since JoinGame.js uses next/router)
jest.mock("next/router", () => require("next-router-mock"));

// Mock GameConnecting component
jest.mock("@/components/wihoot/game/Connecting", () => () => <div>Connecting to game...</div>);

// Mock axios
jest.mock("axios");

describe("JoinGame Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.resetMocks();
        axios.get.mockReset();
        axios.post.mockReset();
        mockRouter.setCurrentUrl("/shared-quiz/join");

        // Mock document.cookie
        Object.defineProperty(document, "cookie", {
            writable: true,
            value: "token=mock-token",
        });
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("renders the JoinGame page correctly", async () => {
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Join a Game")).toBeInTheDocument();
            expect(screen.getByText("Enter a 6-digit game code to join a shared quiz.")).toBeInTheDocument();
            expect(screen.getByLabelText("Game Code")).toBeInTheDocument();
            expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Join Game" })).toBeInTheDocument();
            expect(screen.getByText("Want to create your own quizzes?")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
        });
    });

    it("displays pre-filled username for authenticated users", async () => {
        axios.get.mockResolvedValueOnce({ data: { username: "testUser" } });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByLabelText("Your Name")).toHaveValue("testUser");
            expect(screen.getByLabelText("Your Name")).toBeDisabled();
            expect(screen.queryByText("Want to create your own quizzes?")).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Log In" })).not.toBeInTheDocument();
        });
    });

    it("shows error when game code is invalid (not 6 digits)", async () => {
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const playerNameInput = screen.getByLabelText("Your Name");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "12345" } });
        fireEvent.change(playerNameInput, { target: { value: "testUser" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("Please enter a valid 6-digit game code")).toBeInTheDocument();
            expect(axios.post).not.toHaveBeenCalled();
        });
    });

    it("shows error when player name is empty", async () => {
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "123456" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("Please enter your name")).toBeInTheDocument();
            expect(axios.post).not.toHaveBeenCalled();
        });
    });

    it("successfully joins a game and navigates to play page for guest user", async () => {
        axios.post.mockResolvedValueOnce({ status: 200 });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const playerNameInput = screen.getByLabelText("Your Name");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "ABC123" } });
        fireEvent.change(playerNameInput, { target: { value: "GuestUser" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "http://localhost:8000/shared-quiz/ABC123/join",
                {
                    username: "GuestUser",
                    isGuest: true,
                    playerId: expect.any(String),
                },
                { headers: { "Content-Type": "application/json" } }
            );
            expect(mockRouter.asPath).toMatch(/\/wihoot\/play\?code=ABC123&playerId=/);
        });
    });

    it("successfully joins a game for authenticated user", async () => {
        axios.get.mockResolvedValueOnce({ data: { username: "testUser" } });
        axios.post.mockResolvedValueOnce({ status: 200 });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "ABC123" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "http://localhost:8000/shared-quiz/ABC123/join",
                {
                    username: "testUser",
                    isGuest: false,
                    playerId: "testUser",
                },
                { headers: { "Content-Type": "application/json" } }
            );
            expect(mockRouter.asPath).toMatch(/\/wihoot\/play\?code=ABC123&playerId=testUser/);
        });
    });

    it("displays error message on failed join attempt", async () => {
        axios.post.mockRejectedValueOnce({
            response: { data: { error: "Invalid game code" } },
        });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const playerNameInput = screen.getByLabelText("Your Name");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "ABC123" } });
        fireEvent.change(playerNameInput, { target: { value: "GuestUser" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("Invalid game code")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Join Game" })).not.toBeDisabled();
        });
    });

    it("handles generic API error gracefully", async () => {
        axios.post.mockRejectedValueOnce(new Error("Network error"));

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const playerNameInput = screen.getByLabelText("Your Name");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "ABC123" } });
        fireEvent.change(playerNameInput, { target: { value: "GuestUser" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("An error occurred while joining the game")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Join Game" })).not.toBeDisabled();
        });
    });

    it("displays loading state (GameConnecting) during join attempt", async () => {
        axios.post.mockImplementationOnce(
            () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 500))
        );

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const playerNameInput = screen.getByLabelText("Your Name");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        fireEvent.change(gameCodeInput, { target: { value: "ABC123" } });
        fireEvent.change(playerNameInput, { target: { value: "GuestUser" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("Connecting to game...")).toBeInTheDocument();
        });
    });

    it("converts game code to uppercase on input", async () => {
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");

        fireEvent.change(gameCodeInput, { target: { value: "abc123" } });

        expect(gameCodeInput).toHaveValue("ABC123");
    });

    it("navigates to login page when Log In button is clicked", async () => {
        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const loginButton = screen.getByRole("button", { name: "Log In" });
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(mockRouter.asPath).toBe("/login");
        });
    });

    it("shows connecting... during join attempt", async () => {
        axios.post.mockImplementationOnce(
            () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 500))
        );

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <JoinGame />
                </MemoryRouterProvider>
            );
        });

        const gameCodeInput = screen.getByLabelText("Game Code");
        const playerNameInput = screen.getByLabelText("Your Name");
        const submitButton = screen.getByRole("button", { name: "Join Game" });

        await act(async () => {
            fireEvent.change(gameCodeInput, { target: { value: "ABC123" } });
            fireEvent.change(playerNameInput, { target: { value: "GuestUser" } });
            fireEvent.click(submitButton);
        });

        await waitFor(
            () => {
                expect(screen.getByText("Connecting to game...")).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });
});