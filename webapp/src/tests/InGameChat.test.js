import "@testing-library/jest-dom"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import InGameChat from "./InGameChat"
import fetchMock from "jest-fetch-mock"
import { act } from "react"

// Mock fetch globally
fetchMock.enableMocks()

describe("InGameChat Component", () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  // 1
  test("renders welcome message on initial load", () => {
    render(<InGameChat />)
    expect(screen.getByText("Welcome to the quiz! Ask for hints if you need help.")).toBeInTheDocument()
  })

  // 2
  test("renders with custom initial messages when provided", () => {
    const initialMessages = [{ id: "1", content: "Custom welcome message", isUser: false, type: "welcome" }]
    act(() => {
        render(<InGameChat initialMessages={initialMessages} />)
    });
    expect(screen.getByText("Custom welcome message")).toBeInTheDocument()
  })

  // 3
  test("allows user to type and send a message", async () => {
    render(<InGameChat />)

    // Type in the input field
    const input = screen.getByPlaceholderText("Enter question...")
    act(() => {
        fireEvent.change(input, { target: { value: "What is the capital of Panama?" } })
    });
    expect(input).toHaveValue("What is the capital of Panama?");

    const sendButton = screen.getByRole("button", { name: /send message/i });

    act(() => {
        fireEvent.click(sendButton)
    });

    // Check if user message appears
    await waitFor(() => {
        expect(screen.getByText("What is the capital of Panama?")).toBeInTheDocument()
    });

    // Input should be cleared after sending
    expect(input).toHaveValue("")
  })

  // 4
  test("displays LLM response after sending a message", async () => {
    // Mock the fetch response
    fetchMock.mockResponseOnce(JSON.stringify({
        content: "Panama City is the correct answer!"
    }));
    render(<InGameChat />)

    // Send a message
    const input = screen.getByPlaceholderText("Enter question...")
    act(() => {
        fireEvent.change(input, { target: { value: "What is the capital of Panama?" } })
    });

    // Get the send button by finding it within the input container
    const sendButtonContainer = input.closest(".MuiBox-root")
    const sendButton = sendButtonContainer.querySelector('button[type="button"]')

    act(() => {
        fireEvent.click(sendButton)
    });

    // Wait for and check LLM response
    await waitFor(() => {
      expect(screen.getByText("Panama City is the correct answer!")).toBeInTheDocument()
    })
  })

  // 5
  test("handles API errors gracefully", async () => {
    // Mock a failed fetch
    fetchMock.mockRejectOnce(new Error("Network error"))

    render(<InGameChat />)

    // Send a message
    const input = screen.getByPlaceholderText("Enter question...")
    act(() => {
        fireEvent.change(input, { target: { value: "Is it Panama City?" } })
    });

    // Get the send button by finding it within the input container
    const sendButtonContainer = input.closest(".MuiBox-root")
    const sendButton = sendButtonContainer.querySelector('button[type="button"]')
    act(() => {
        fireEvent.click(sendButton)
    });
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText("Oh no! There has been an error processing your request.")).toBeInTheDocument()
    })
  })

  // 6
  test("can minimize and maximize the chat", () => {
    render(<InGameChat />)

    // Initially the chat should be maximized
    expect(screen.getByText("Ask for hints")).toBeInTheDocument()

    // Click the minimize button - find it by its position in the header
    const header = screen.getByText("Ask for hints").closest(".MuiBox-root")
    const minimizeButton = header.querySelector("button")
    act(() => {
        fireEvent.click(minimizeButton);
    });

    // Chat should be minimized (header should not be visible)
    expect(screen.queryByText("Ask for hints")).not.toBeInTheDocument()

    // When minimized, there should be a button to maximize
    // Since we can't rely on the name, we'll check for the button's existence
    const chatButton =
      document.querySelector('button[aria-label="Open chat"]') ||
      document.querySelector('button[style*="position: fixed"]')
    expect(chatButton).toBeInTheDocument()

    // Click the chat button to maximize
    act(() => {
        fireEvent.click(chatButton)
    });

    // Chat should be maximized again
    expect(screen.getByText("Ask for hints")).toBeInTheDocument()
  })

  // 7
  test("sends message when pressing Enter key", async () => {
    render(<InGameChat />)

    // Type in the input field and press Enter
    const input = screen.getByPlaceholderText("Enter question...")
    act(() => {
        fireEvent.change(input, { target: { value: "What is the capital of Panama?" } })
    });
    act(() => {
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
    });

    // Check if user message appears
    await waitFor(() => {
        expect(screen.getByText("What is the capital of Panama?")).toBeInTheDocument()
    });
  })

  // 8
  test("verifies correct API payload is sent", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({id: Date.now().toString(), content: "Panama City is the correct answer!",
        isUser: false, type: "answer"}));

    render(<InGameChat />)

    // Send a message
    const input = screen.getByPlaceholderText("Enter question...")
    act(() => {
        fireEvent.change(input, { target: { value: "Test question" } })
    }
    );

    // Get the send button by finding it within the input container
    const sendButtonContainer = input.closest(".MuiBox-root")
    const sendButton = sendButtonContainer.querySelector('button[type="button"]')
    act(() => {
        fireEvent.click(sendButton)
    });

    // Verify the fetch call
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/askllm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: [{ role: "user", content: "Test question" }],
          model: "empathy",
          possibleAnswers: {
            answers: ["San José", "Lima", "Perugia", "Panama City"],
            right_answer: "Panama City",
          },
        }),
      })
    })
  })
})

