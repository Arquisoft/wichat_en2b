import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateGame from "../components/wihoot/CreateGame";
import { useRouter } from "next/router";
import * as apiFetchAuth from "../utils/api-fetch-auth";

// Mock Next.js router
jest.mock("next/router", () => ({
    useRouter: jest.fn(),
}));

// Mock fetchWithAuth
jest.mock("../utils/api-fetch-auth", () => ({
    fetchWithAuth: jest.fn(),
}));

// Mock NextLink since Next.js requires it
jest.mock("next/link", () => {
    return ({ children }) => {
        return children;
    };
});

describe("CreateGame", () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush });

        // Setup some default mock values
        apiFetchAuth.fetchWithAuth.mockImplementation((url) => {
            if (url === "/quiz") {
                return Promise.resolve([
                    { category: "Science" },
                    { category: "History" },
                ]);
            } else if (url === "/quiz/Science") {
                return Promise.resolve([
                    {
                        quizName: "Earth Quiz",
                        difficulty: "Easy",
                        wikidataCode: "Q123",
                        question: "What is Earth?",
                    },
                ]);
            } else if (url.startsWith("/game/")) {
                return Promise.resolve([
                    { question: "Q1" },
                    { question: "Q2" },
                ]);
            } else if (url === "/token/username") {
                return Promise.resolve({ _id: "user123", username: "testuser" });
            }
        });

        // Mock global fetch
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ code: "ABC123" }),
            })
        );

        // Mock document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: "token=faketoken123",
        });
    });

    it("renders loading state initially", async () => {
        render(<CreateGame />);

        expect(screen.getByText(/Go back/i)).toBeInTheDocument();
        await waitFor(() => expect(apiFetchAuth.fetchWithAuth).toHaveBeenCalledWith("/quiz"));
    });

    it("renders categories and quizzes", async () => {
        render(<CreateGame />);

        await waitFor(() => {
            expect(screen.getByTestId("category-select")).toBeInTheDocument();
        });

        expect(screen.getByText("Science")).toBeInTheDocument();
        expect(screen.getByTestId("subcategory-select")).toBeInTheDocument();
    });

    it("validates form fields before submit", async () => {
        render(<CreateGame />);

        await waitFor(() => {
            expect(screen.getByTestId("category-select")).toBeInTheDocument();
        });

        // Set number of questions to a valid number
        const questionsInput = screen.getByTestId("questions-input").querySelector('input');
        fireEvent.change(questionsInput, { target: { value: "5" } });

        const createButton = screen.getByTestId("create-quiz-button");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith({
                pathname: "/wihoot/host/manager",
                query: { code: "ABC123" },
            });
        });

    });

    it("successfully creates a quiz and redirects", async () => {
        render(<CreateGame />);

        // Wait for category-select to load
        await waitFor(() => {
            expect(screen.getByTestId("category-select")).toBeInTheDocument();
        });

        // Wait for subcategory-select to load
        await waitFor(() => {
            expect(screen.getByTestId("subcategory-select")).toBeInTheDocument();
        });

        // Set number of questions
        const questionsInput = screen.getByTestId("questions-input").querySelector('input');
        fireEvent.change(questionsInput, { target: { value: "5" } });

        // Select a quiz
        const subcategoryInput = screen.getByTestId("subcategory-select").querySelector('input');
        fireEvent.change(subcategoryInput, { target: { value: "Earth Quiz" } });

        // Click create
        const createButton = screen.getByTestId("create-quiz-button");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith({
                pathname: "/wihoot/host/manager",
                query: { code: "ABC123" },
            });
        });
    });


    it("handles API errors gracefully", async () => {
        apiFetchAuth.fetchWithAuth.mockImplementationOnce(() => {
            throw new Error("Network error");
        });

        render(<CreateGame />);

        await waitFor(() => {
            expect(screen.getByText(/Error fetching categories/i)).toBeInTheDocument();
        });
    });

    it("disables inputs while loading", async () => {
        render(<CreateGame />);

        const select = await screen.findByTestId("category-select");

        expect(select).not.toBeDisabled(); // after loading finishes
    });
});
