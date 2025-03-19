// InGameChat.js
import React, { useState, useRef, useEffect } from "react";
import PropTypes from 'prop-types';
import { Box, Paper, Typography, TextField, Button, IconButton, Stack } from "@mui/material";
import '../../styles/InGameChat.css'; // Import the CSS file

InGameChat.propTypes = {
    initialMessages: PropTypes.array
};

export default function InGameChat(params) {
    const initialMessages = params.initialMessages;

    const [messages, setMessages] = useState(initialMessages.length > 0 ? initialMessages : [
        { id: "1", content: "Welcome to the quiz! Ask for hints if you need help.", isUser: false, type: "welcome" },
    ]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (input.trim() === "") return;

        const newMessage = {
            id: Date.now().toString(),
            content: input,
            isUser: true,
            type: "question"
        };

        setMessages([...messages, newMessage]);
        setInput("");

        // Thinking animation
        setIsThinking(true);

        try {
            const response = await fetch("http://localhost:8000/askllm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversation: [{ role: "user", content: input }],
                    model: "empathy",
                    possibleAnswers: {answers: params.question.answers, right_answer: params.question.right_answer}
                })
            });
            const data = await response.json();
            setIsThinking(false);

            if (data.content) {
                const llmMessage = {
                    id: Date.now().toString() + "_llm",
                    content: data.content,
                    isUser: false,
                    type: "response"
                };

                setMessages((prevMessages) => [...prevMessages, llmMessage]);
            } else {
                console.error("Invalid LLM response", data);
            }
        } catch (error) {
            console.log(error);
            setIsThinking(false);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    id: Date.now().toString() + "_error",
                    content: "Oh no! There has been an error processing your request.",
                    isUser: false,
                    type: "error",
                },
            ]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    };

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    // If it's minimized, return ONLY the button for displaying the chat
    if (isMinimized) {
        return (
            <button onClick={toggleMinimize} className="chatButton" aria-label="Open chat">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        );
    }

    return (
        <div className="chatWindow">
            {/* Chat Header */}
            <div className="chatHeader">
                <Typography variant="subtitle1" fontWeight="medium">
                    Ask for hints
                </Typography>
                <IconButton onClick={toggleMinimize} size="small">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </IconButton>
            </div>

            {/* Chat Messages */}
            <div className="messageArea">
                <Stack spacing={2}>
                    {messages.map((message) => (
                        <div key={message.id} className={`messageBubble ${message.isUser ? 'userMessage' : 'llmMessage'}`}>
                            <Typography variant="body2">{message.content}</Typography>
                        </div>
                    ))}

                    {isThinking && <ThinkingIndicator />}

                    <div ref={messagesEndRef} />
                </Stack>
            </div>

            {/* Chat Input */}
            <div className="chatInputArea">
                <TextField
                    fullWidth
                    size="small"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter question..."
                    variant="outlined"
                    className="chatInputField"
                    disabled={isThinking}
                />
                <Button
                    aria-label="Send Message"
                    variant="contained"
                    color="primary"
                    onClick={handleSendMessage}
                    className="chatSendButton"
                    disabled={isThinking}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </Button>
            </div>
        </div>
    );
}

const ThinkingIndicator = () => (
    <div className="thinkingIndicator">
        <span />
        <span />
        <span />
    </div>
);