import { render, screen, waitFor } from "@testing-library/react";
import CategoryComponent from "@/components/home/QuizzCategory";
import { useRouter } from "next/router";
import { quizzesByCategory, quizCategories } from "@/components/home/data";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/game/QuestionGame", () => jest.fn(() => <div>Game Component</div>));

describe("CategoryComponent", () => {
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      query: { id: "1" },
    };
    
    useRouter.mockReturnValue(mockRouter);
  });

  test("Shows loading message at start", async () => {
    render(<CategoryComponent />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("Shows 'No quizzes available for this category' if the category does not exist", async () => {
    mockRouter.query.id = "999"; // ID of non-existent category
    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("Shows 'No quizzes available for this category' if there are no quizzes for the category", async () => {
    mockRouter.query.id = "7"; // ID of category with no quizzes
    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("Shows the list of available quizzes for a valid category", async () => {
    quizzesByCategory["1"] = [
      { id: 1, title: "Quiz 1", description: "Test Quiz", difficulty: "easy", timeEstimate: 60, questions: 10 },
    ];

    quizCategories.push({ id: 1, name: "Science", icon: "🔬", color: "blue" });
    
    render(<CategoryComponent />);
    
    await waitFor(() => {
      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      expect(screen.getByText("Test Quiz")).toBeInTheDocument();
    });
  });

  test("Shows the correct number of quizzes for a valid category", async () => {
    quizzesByCategory["1"] = [
      { id: 1, title: "Quiz 1", description: "Test Quiz", difficulty: "easy", timeEstimate: 60, questions: 10 },
      { id: 2, title: "Quiz 2", description: "Another Test Quiz", difficulty: "medium", timeEstimate: 120, questions: 15 },
    ];

    render(<CategoryComponent />);
    
    await waitFor(() => {
      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      expect(screen.getByText("Quiz 2")).toBeInTheDocument();
      expect(screen.getByText("Another Test Quiz")).toBeInTheDocument();
    });
  });
});
