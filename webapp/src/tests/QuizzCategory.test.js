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

  test("Muestra el mensaje de carga al inicio", async () => {
    render(<CategoryComponent />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("Muestra 'No quizzes available for this category' si la categoría no existe", async () => {
    mockRouter.query.id = "999"; // ID de categoría inexistente
    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("Muestra 'No quizzes available for this category' si no hay cuestionarios para la categoría", async () => {
    quizzesByCategory["1"] = []; // Sin cuestionarios
    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("Muestra la lista de cuestionarios disponibles para una categoría válida", async () => {
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
});
