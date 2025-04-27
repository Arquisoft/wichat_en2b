import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CreateGame from "@/components/wihoot/CreateGame";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";
import mockRouter from "next-router-mock";
import * as apiFetchAuth from "@/utils/api-fetch-auth";
import fetchMock from "jest-fetch-mock";

// Enable fetch mocking
fetchMock.enableMocks();

// Mock dependencies
jest.mock("next/router", () => require("next-router-mock"));
jest.mock("@/utils/api-fetch-auth");

// Mock document.cookie
Object.defineProperty(document, "cookie", {
    writable: true,
    value: "token=mock-token",
});

describe("CreateGame Component", () => {
    const mockTopics = ["History", "Science", "Math"];
    const mockUserData = { _id: "user123", username: "TestUser" };
    const mockQuizData = {
        wikidataCode: "Q123",
        questions: [{ question_id: "q1", answers: ["A", "B", "C", "D"] }],
    };
    const mockQuizMetaData = {
        wikidataCode: "Q123",
        difficulty: 1,
        quizName: "Test Quiz",
        timePerQuestion: 30,
    };
    const mockSessionData = { code: "ABC123" };

    beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.resetMocks();
        apiFetchAuth.fetchWithAuth.mockReset();
        mockRouter.setCurrentUrl("/wihoot/create");

        // Mock environment variable
        process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL = "http://localhost:8000";
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("renders CreateGame form correctly", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(mockTopics);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Start a new session")).toBeInTheDocument();
            expect(screen.getByLabelText(/Topic/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Number of Questions/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Number of Answers/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Difficulty/i)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Create Shared Quiz" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
        });
    });

    it("fetches and displays topics on mount", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(mockTopics);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            expect(apiFetchAuth.fetchWithAuth).toHaveBeenCalledWith("/quiz/allTopics");

            // Verify that the Select component's native input has the first topic as its value
            const topicSelectInput = screen.getByTestId("topic-select").querySelector('input[aria-hidden="true"]');
            expect(topicSelectInput).toHaveValue(mockTopics[0]); // Should be "History"

            // Verify that the displayed text in the Select is the first topic
            expect(screen.getByText("History")).toBeInTheDocument();
        });

        // Open the Select dropdown by clicking the select element
        const topicSelect = screen.getByTestId("topic-select");
        fireEvent.click(topicSelect); // Try click instead of mouseDown for broader compatibility


        // Wait for the dropdown options to appear
        await waitFor(
            () => {
                // Verify each topic is present in the dropdown
                expect(screen.getByText("History")).toBeInTheDocument();

            },
            { timeout: 3000 } // Increase timeout to account for MUI rendering delays
        );
    });

    it("updates form inputs correctly", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(["History", "Science"]);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame/>
                </MemoryRouterProvider>
            );
        });

        let select;
        let questionsInput
        let answersInput
        let difficultyInput
        await waitFor(() => {
            select = screen.getByRole("combobox", {name: /Topic/i});
            questionsInput = screen.getByLabelText(/Number of Questions/i)
            answersInput = screen.getByLabelText(/Number of Answers/i);
            difficultyInput = screen.getByLabelText(/Difficulty/i);
            expect(screen.getByDisplayValue("History")).toBeInTheDocument();

        }, {timeout: 3000});

        await act(async () => {
            fireEvent.mouseDown(select); // Opens the dropdown
            // Wait for the dropdown options to appear
            await waitFor(
                () => {

                    const scienceOption = screen.getByRole("option", {name: "Science"});

                    fireEvent.click(scienceOption);
                }, {timeout: 3000});

            fireEvent.mouseDown(difficultyInput)
            await waitFor(
                () => {

                    const option = screen.getByRole("option", {name: "Hard"});

                    fireEvent.click(option);
                }, {timeout: 3000});

            fireEvent.change(questionsInput, {target: {value: "10"}});
            fireEvent.change(answersInput, {target: {value: "10"}});
        });
    });

    it("successfully creates a quiz and navigates to host manager", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce(mockTopics)
            .mockResolvedValueOnce([{ wikidataCode: "Q123", difficulty: 1 }])
            .mockResolvedValueOnce(mockQuizData)
            .mockResolvedValueOnce(mockUserData);

        fetchMock.mockResponseOnce(JSON.stringify(mockSessionData));

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId("create-quiz-button"));
        });

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                "http://localhost:8000/shared-quiz/create",
                expect.objectContaining({
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer mock-token",
                    },
                    body: JSON.stringify({
                        quizData: mockQuizData,
                        quizMetaData: { wikidataCode: "Q123", difficulty: 1 },
                        hostId: "user123",
                        hostUsername: "TestUser",
                    }),
                })
            );
            expect(mockRouter.asPath).toBe("/wihoot/host/manager?code=ABC123");
        }, { timeout: 3000 });
    });

    it("displays error when no quiz matches selected difficulty", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce(mockTopics)
            .mockResolvedValueOnce([{ wikidataCode: "Q123", difficulty: 2 }]);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId("create-quiz-button"));
        });

        await waitFor(
            () => {
                expect(screen.getByText("No quiz found for the difficulty selected.")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("displays error when fetching topics fails", async () => {
        apiFetchAuth.fetchWithAuth.mockRejectedValueOnce(new Error("Failed to fetch topics"));

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

    it("navigates to home page when 'Go back' button is clicked", async () => {
        apiFetchAuth.fetchWithAuth.mockResolvedValueOnce(mockTopics);

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByRole("button", { name: "Go back" }));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe("/");
        });
    });

    it("handles API error during quiz creation", async () => {
        apiFetchAuth.fetchWithAuth
            .mockResolvedValueOnce(mockTopics)
            .mockResolvedValueOnce([{ wikidataCode: "Q123", difficulty: 1 }])
            .mockResolvedValueOnce(mockQuizData)
            .mockResolvedValueOnce(mockUserData);

        fetchMock.mockRejectOnce(new Error("Failed to create shared quiz"));

        await act(async () => {
            render(
                <MemoryRouterProvider>
                    <CreateGame />
                </MemoryRouterProvider>
            );
        });

        await waitFor(() => {
            fireEvent.click(screen.getByTestId("create-quiz-button"));
        });

        await waitFor(() => {
            expect(screen.getByText("Failed to create shared quiz")).toBeInTheDocument();
        });
    });
});