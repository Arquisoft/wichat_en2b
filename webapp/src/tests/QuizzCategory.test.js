import { render, screen, waitFor } from "@testing-library/react";
import CategoryComponent from "@/components/home/QuizzCategory";
import { useRouter } from "next/router";

// Mock next/router
jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

// Mock the game component if it's conditionally rendered
jest.mock("@/components/game/QuestionGame", () => () => <div>Game Component</div>);

describe("CategoryComponent", () => {
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      query: { id: "1" },
    };

    useRouter.mockReturnValue(mockRouter);
    global.fetch = jest.fn(); // Mock fetch
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("Shows loading message at start", () => {
    render(<CategoryComponent />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("Shows 'No quizzes available for this category' if the category does not exist", async () => {
    mockRouter.query.id = "999";

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("Shows 'No quizzes available for this category' if there are no quizzes for the category", async () => {
    mockRouter.query.id = "7";

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("Shows the list of available quizzes for a valid category", async () => {
    mockRouter.query.id = "1";

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          quizName: "Quiz 1",
          description: "Test Quiz",
          difficulty: 1,
          timePerQuestion: 60,
          numQuestions: 10,
        },
      ],
    });

    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      expect(screen.getByText("Test Quiz")).toBeInTheDocument();
    });
  });

  test("Shows the correct number of quizzes for a valid category", async () => {
    mockRouter.query.id = "1";

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          quizName: "Quiz 1",
          description: "Test Quiz",
          difficulty: 1,
          timePerQuestion: 60,
          numQuestions: 10,
        },
        {
          id: 2,
          quizName: "Quiz 2",
          description: "Another Test Quiz",
          difficulty: 2,
          timePerQuestion: 90,
          numQuestions: 12,
        },
      ],
    });

    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      expect(screen.getByText("Quiz 2")).toBeInTheDocument();
      expect(screen.getByText("Another Test Quiz")).toBeInTheDocument();
    });
  });
});
