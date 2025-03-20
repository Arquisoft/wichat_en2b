import React, { act } from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InGameChat from "../components/game/InGameChat";
import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

describe("InGameChat Component", () => {
  function openChat() {
    const button = document.querySelector(".chatButton");
    fireEvent.click(button);
  }

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("renders default welcome message if no initial messages are provided", () => {
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);
    openChat();
    expect(screen.getByText("Welcome to the quiz! Ask for hints if you need help.")).toBeInTheDocument();
  });

  it("renders custom initial messages if it is provided", () => {
    const initialMessages = [{ id: "1", content: "Custom message", isUser: false, type: "welcome" }];
    render(<InGameChat initialMessages={initialMessages} question={{ answers: [], right_answer: "" }} />);

    openChat();

    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });

  it("allows user to type and send a message and it is displayed correcly", async () => {
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);

    openChat();

    const input = screen.getByPlaceholderText("Enter question...");
    fireEvent.change(input, { target: { value: "What is the capital of Panama?" } });
    expect(input).toHaveValue("What is the capital of Panama?");

    fireEvent.click(document.querySelector(".sendButton"));

    (await waitFor(() => expect(screen.getByText("What is the capital of Panama?")))).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("displays LLM response after sending a message", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ content: "Panama City is the correct answer!" }));

    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);

    openChat();

    fireEvent.change(screen.getByPlaceholderText("Enter question..."), { target: { value: "What is the capital of Panama?" } });

    fireEvent.click(document.querySelector(".sendButton"));

    await (await waitFor(() => expect(screen.getByText("Panama City is the correct answer!")))).toBeInTheDocument();
  });

  it("shows loading indicator while fetching response", async () => {
    fetchMock.mockResponseOnce(() => new Promise((resolve) => setTimeout(() => resolve({body: "{\"content\": \"Test response\"}"}), 500)));
    render(<InGameChat initialMessages={[]} question={{answers: [], right_answer: ""}}/>);

    openChat();

    fireEvent.change(screen.getByPlaceholderText("Enter question..."), {target: {value: "Any question?"}});

    fireEvent.click(document.querySelector(".sendButton"));

    expect(document.querySelector(".MuiCircularProgress-root")).toBeInTheDocument();

    await waitFor(() => expect(document.querySelector(".MuiCircularProgress-root")).not.toBeInTheDocument());
  });

  it("handles LLM API errors gracefully", async () => {
    fetchMock.mockRejectOnce(new Error("Network error"));
    render(<InGameChat initialMessages={[]} question={{answers: [], right_answer: ""}}/>);

    openChat();

    fireEvent.change(screen.getByPlaceholderText("Enter question..."), {target: {value: "Is this working?"}});

    fireEvent.click(document.querySelector(".sendButton"));

    await waitFor(() => expect(screen.getByText("Oh no! There has been an error processing your request.")).toBeInTheDocument());
  });

  it("minimizes and maximizes the chat window correctly", () => {
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);

    let openButton = document.querySelector(".chatButton");
    let sendButton = document.querySelector(".sendButton");
    let inputField = document.querySelector(".inputField");

    expect(openButton).toBeInTheDocument();
    expect(sendButton).not.toBeInTheDocument();
    expect(inputField).not.toBeInTheDocument();

    fireEvent.click(openButton);

    sendButton = document.querySelector(".sendButton");
    inputField = document.querySelector(".inputField");

    expect(openButton).not.toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(inputField).toBeInTheDocument();
  });

  it("sends message when pressing Enter key", async () => {
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);

    openChat();

    const input = screen.getByPlaceholderText("Enter question...");

    fireEvent.change(input, { target: { value: "Enter key test?" } });

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await (await waitFor(() => expect(screen.getByText("Enter key test?")))).toBeInTheDocument();
  });

  it("the API request structure is the one expected", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ content: "Mock response" }));

    const question = { answers: ["A", "B", "C", "D"], right_answer: "D" };
    render(<InGameChat initialMessages={[]} question={question} />);

    openChat();

    fireEvent.change(screen.getByPlaceholderText("Enter question..."), { target: { value: "API test?" } });

    fireEvent.click(document.querySelector(".sendButton"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/askllm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: [{ role: "user", content: "API test?" }],
          model: "empathy",
          possibleAnswers: { answers: ["A", "B", "C", "D"], right_answer: "D" },
        }),
      });
    });
  });
});
