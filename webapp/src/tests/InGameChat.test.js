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

  test("renders default welcome message if no initial messages are provided", () => {
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);
    openChat();
    expect(screen.getByText("Welcome to the quiz! Ask for hints if you need help.")).toBeInTheDocument();
  });

  test("renders custom initial messages if provided", () => {
    const initialMessages = [{ id: "1", content: "Custom message", isUser: false, type: "welcome" }];
    render(<InGameChat initialMessages={initialMessages} question={{ answers: [], right_answer: "" }} />);
    openChat();
    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });

  test("allows user to type and send a message", async () => {
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);

    openChat();

    const input = screen.getByPlaceholderText("Enter question...");
    fireEvent.change(input, { target: { value: "What is the capital of Panama?" } });
    expect(input).toHaveValue("What is the capital of Panama?");

    fireEvent.click(document.querySelector(".sendButton"));

    (await waitFor(() => expect(screen.getByText("What is the capital of Panama?")))).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  test("displays LLM response after sending a message", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ content: "Panama City is the correct answer!" }));
    render(<InGameChat initialMessages={[]} question={{ answers: [], right_answer: "" }} />);

    openChat();

    const input = screen.getByPlaceholderText("Enter question...");
    fireEvent.change(input, { target: { value: "What is the capital of Panama?" } });

    fireEvent.click(document.querySelector(".sendButton"));

    await (await waitFor(() => expect(screen.getByText("Panama City is the correct answer!")))).toBeInTheDocument();
  });
});
