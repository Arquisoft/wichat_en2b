import { render, screen, waitFor } from "@testing-library/react";
import { NextRouter } from "next-router-mock";
import CategoryComponent from "../components/home/QuizzCategory";
import { quizzesByCategory } from "../components/home/data";

// Mock de NextRouter
jest.mock("next/router", () => require("next-router-mock"));

describe("CategoryComponent", () => {
  test("shows loading state while quizzes are loading", () => {
    // Empuja una ruta válida para simular el enrutador
    NextRouter.push("/category/1");

    render(<CategoryComponent />);

    // Verifica el mensaje de loading
    expect(screen.getByText("Loading quizzes...")).toBeInTheDocument();
    expect(screen.queryByText("Category Not Found")).not.toBeInTheDocument();
  });

  test("displays an error when the category does not exist", async () => {
    // Empuja una ruta no válida
    NextRouter.push("/category/999");

    render(<CategoryComponent />);

    await waitFor(() => {
      // Verifica el mensaje de error
      expect(screen.getByText("Category Not Found")).toBeInTheDocument();
    });

    expect(screen.getByText("The category you're looking for doesn't exist.")).toBeInTheDocument();
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  test("does not show quizzes if no quizzes are available for the category", async () => {
    const emptyQuizzes = [];

    // Simula el uso de setTimeout
    jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb());

    // Empuja una categoría que existe pero sin quizzes
    NextRouter.push("/category/1");

    // Mock de quizzesByCategory para devolver un array vacío
    quizzesByCategory["1"] = emptyQuizzes;

    render(<CategoryComponent />);

    await waitFor(() => {
      expect(screen.getByText("No quizzes available for this category.")).toBeInTheDocument();
    });
  });

  test("does not show the quiz if there's an error in the data", async () => {
    const invalidQuiz = { id: 1, title: "", description: "" };

    // Simula el uso de setTimeout
    jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb());

    // Empuja una categoría válida
    NextRouter.push("/category/1");

    // Mock de quizzesByCategory para devolver un quiz inválido
    quizzesByCategory["1"] = [invalidQuiz];

    render(<CategoryComponent />);

    // Verifica que no se muestre el botón de "Start Quiz" porque los datos son inválidos
    await waitFor(() => {
      expect(screen.queryByText("Start Quiz")).not.toBeInTheDocument();
    });
  });
});
