import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CreateGame from "../components/wihoot/CreateGame";
import fetchMock from "jest-fetch-mock";
import mockRouter from "next-router-mock";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";
import * as apiFetchAuth from "../utils/api-fetch-auth";

// Enable fetch mocking
fetchMock.enableMocks();

// Mock next/router
jest.mock("next/router", () => require("next-router-mock"));

// Mock fetchWithAuth
jest.mock("../utils/api-fetch-auth");

// Mock document.cookie
Object.defineProperty(document, "cookie", {
    writable: true,
    value: "token=mock-token",
});

describe("CreateGame Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.resetMocks();
        jest.clearAllMocks();
        mockRouter.setCurrentUrl("/wihoot/create");
        apiFetchAuth.fetchWithAuth.mockReset();
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("renders the CreateGame page correctly", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(["History", "Science"]);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(
            () => {
                expect(apiFetchAuth.fetchWithAuth).toHaveBeenCalledWith("/quiz/allTopics");
                expect(screen.getByText("Create a Shared Quiz")).toBeInTheDocument();
                expect(screen.getByText("Create a quiz and share it with friends using a unique code.")).toBeInTheDocument();
                expect(screen.getByLabelText(/Number of Questions/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/Number of Answers/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/Difficulty of the Quiz/i)).toBeInTheDocument();
                expect(screen.getByRole("button", { name: "Create Shared Quiz" })).toBeInTheDocument();

                // Verify the Select displays the default topic
                const select = screen.getByRole("combobox", { name: /Topic/i });

                expect(screen.getByDisplayValue("History")).toBeInTheDocument();

                // Open the Select to verify MenuItem options
                fireEvent.mouseDown(select); // Opens the dropdown

                // Test options are shown on click
                expect(screen.getByRole("option", { name: "History" })).toBeInTheDocument();
                expect(screen.getByRole("option", { name: "Science" })).toBeInTheDocument();
            },
            { timeout: 3000 } // Increased timeout for Material UI render failing
        );
    });

    it("updates form inputs correctly", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(["History", "Science"]);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        let select;
        let questionsInput
        let answersInput
        let difficultyInput
        await waitFor(() => {
            select = screen.getByRole("combobox", { name: /Topic/i });
            questionsInput = screen.getByLabelText(/Number of Questions/i)
            answersInput = screen.getByLabelText(/Number of Answers/i);
            difficultyInput = screen.getByLabelText(/Difficulty of the Quiz/i);
            expect(screen.getByDisplayValue("History")).toBeInTheDocument();

        }, { timeout: 3000 });

        await act(async () => {
            fireEvent.mouseDown(select); // Opens the dropdown
            // Wait for the dropdown options to appear
            await waitFor(
                () => {
                    console.log("Listbox present:", !!screen.queryByRole("listbox"));
                    const scienceOption = screen.getByRole("option", { name: "Science" });
                    console.log("Science option found:", !!scienceOption);
                    fireEvent.click(scienceOption);
                },{ timeout: 3000 });

            fireEvent.change(questionsInput, { target: { value: "10" } });
            fireEvent.change(answersInput, { target: { value: "10" } });
            fireEvent.change(difficultyInput, { target: { value: "4" } });
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue("Science")).toBeInTheDocument();
            expect(questionsInput).toHaveValue(10);
            expect(answersInput).toHaveValue(10);
            expect(difficultyInput).toHaveValue(4);

        }, { timeout: 3000 });
    });

    it("shows error when topic fetch fails", async () => {
        apiFetchAuth.fetchWithAuth.mockRejectedValueOnce(new Error("Network error"));

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Error fetching topics")).toBeInTheDocument();
        });
    });

    it("shows error when no quizzes are available for the topic", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce(["History"]) // /quiz/allTopics
            .mockResolvedValueOnce([]); // /quiz/History

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        const submitButton = screen.getByRole("button", { name: "Create Shared Quiz" });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText("No quizzes available for the selected topic.")).toBeInTheDocument();
        });
    });

    it("successfully creates a quiz and navigates to host manager", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce(["History"]) // /quiz/allTopics
            .mockResolvedValueOnce([{ wikidataCode: "Q123", difficulty: 1 }]) // /quiz/History
            .mockResolvedValueOnce({ questions: [], answers: [] }) // /game/Q123/5/4
            .mockResolvedValueOnce({ _id: "user123", username: "testUser" }); // /token/username

        fetchMock.mockResponseOnce(JSON.stringify({ code: "ABC123" }), { status: 200 });

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        const submitButton = screen.getByRole("button", { name: "Create Shared Quiz" });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                "http://localhost:8000/shared-quiz/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer mock-token",
                    },
                    body: JSON.stringify({
                        quizData: { questions: [], answers: [] },
                        quizMetaData: { wikidataCode: "Q123", difficulty: 1 },
                        hostId: "user123",
                        hostUsername: "testUser",
                    }),
                }
            );
            expect(mockRouter.asPath).toBe("/wihoot/host/manager?code=ABC123");
        });
    });

    it("handles API errors during quiz creation", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce(["History"]) // /quiz/allTopics
            .mockResolvedValueOnce([{ wikidataCode: "Q123", difficulty: 1 }]) // /quiz/History
            .mockRejectedValueOnce(new Error("Failed to create quiz")); // /game/Q123/5/4

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        const submitButton = screen.getByRole("button", { name: "Create Shared Quiz" });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText("Failed to create quiz")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Create Shared Quiz" })).not.toBeDisabled();
        });
    });

    it("disables inputs and button during quiz creation", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(["History"]);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        const topicSelect = screen.getByTestId("topic-select");
        const questionsInput = screen.getByTestId("questions-input").querySelector("input");
        const answersInput = screen.getByTestId("answers-input").querySelector("input");
        const difficultyInput = screen.getByTestId("difficulty-input").querySelector("input");
        const submitButton = screen.getByTestId("create-quiz-button");

        // Mock subsequent API calls with delay to keep isLoading true
        apiFetchAuth.fetchWithAuth
            .mockImplementationOnce(
                () => new Promise((resolve) => setTimeout(() => resolve([{ wikidataCode: "Q123", difficulty: 1, textName: "Test?", _id: "mockId" }]), 500))
            ) // /quiz/History
            .mockResolvedValueOnce({ questions: [], answers: [] }) // /game/Q123/5/4
            .mockResolvedValueOnce({ _id: "user123", username: "testUser" }); // /token/username

        fetchMock.mockResponseOnce(JSON.stringify({ code: "ABC123" }), { status: 200 }); // /shared-quiz/create

        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(
            () => {
                console.log("Button text:", submitButton.textContent);
                console.log("topicSelect disabled:", topicSelect.querySelector(".MuiSelect-nativeInput")?.getAttribute("disabled"));
                console.log("questionsInput disabled:", questionsInput?.getAttribute("disabled"));
                console.log("answersInput disabled:", answersInput?.getAttribute("disabled"));
                console.log("difficultyInput disabled:", difficultyInput?.getAttribute("disabled"));
                console.log("submitButton disabled:", submitButton.disabled);
                expect(screen.getByText("Creating...")).toBeInTheDocument();
                expect(topicSelect.querySelector(".MuiSelect-nativeInput")).toHaveAttribute("disabled");
                expect(questionsInput).toHaveAttribute("disabled");
                expect(answersInput).toHaveAttribute("disabled");
                expect(difficultyInput).toHaveAttribute("disabled");
                expect(submitButton).toBeDisabled();
            },
            { timeout: 3000 }
        );
    });

    it("shows loading state during quiz creation", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(["History"]);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        const submitButton = screen.getByRole("button", { name: "Create Shared Quiz" });

        // Mock API with delay
        apiFetchAuth.fetchWithAuth.mockImplementationOnce(
            () => new Promise((resolve) => setTimeout(() => resolve([{ wikidataCode: "Q123", difficulty: 1 }]), 500))
        );

        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText("Creating...")).toBeInTheDocument();
            expect(screen.getByRole("progressbar")).toBeInTheDocument();
        });
    });
});