import React, { useState, useRef, useEffect } from "react";
import { Box, Paper, Typography, TextField, Button, IconButton, Stack, CircularProgress } from "@mui/material";
import '../../styles/InGameChat.css';
import {FaAngleDown, FaPaperPlane, FaRobot} from "react-icons/fa";

export default function InGameChat(params) {
    const { initialMessages, question } = params;

    const [messages, setMessages] = useState(initialMessages.length > 0 ? initialMessages : [
        { id: "1", content: "Welcome to the quiz! Ask for hints if you need help.", isUser: false, type: "welcome" },
    ]);
    const [isMinimized, setIsMinimized] = useState(true);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

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

        setMessages(prevMessages => [...prevMessages, newMessage]);
        setInput("");

        setIsThinking(true);

        try {
            const response = await fetch("http://localhost:8000/askllm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversation: [{ role: "user", content: input }],
                    model: "empathy",
                    possibleAnswers: { answers: question.answers, right_answer: question.right_answer }
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

                setMessages(prevMessages => [...prevMessages, llmMessage]);
            } else {
                setIsThinking(false);
                setMessages(prevMessages => [
                    ...prevMessages,
                    {
                        id: Date.now().toString() + "_error",
                        content: "Oh no! There has been an error processing your request.",
                        isUser: false,
                        type: "error",
                    },
                ]);
            }
        } catch (error) {
            setIsThinking(false);
            setMessages(prevMessages => [
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

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    if (isMinimized) {
        return (
            <IconButton
                onClick={toggleMinimize}
                className="chatButton"
                aria-label="Open chat"
                size="large"
            >
                <FaRobot />
            </IconButton>
        );
    }

    return (
        <Box className="chatWindow">
            {/* Header */}
            <Box className={"chatHeader"} display="flex" justifyContent="space-between" alignItems="center" p={2}>
                <Typography variant="h6" fontWeight="medium" className="headerText">Ask for hints</Typography>
                <IconButton onClick={toggleMinimize} size="small" className="minimizeButton">
                    <FaAngleDown />
                </IconButton>
            </Box>

            {/* Decorative Divider */}
            <div className="divider"></div>

            {/* Messages Area */}
            <Box className="messageArea" p={2}>
                <Stack spacing={2}>
                    {messages.map((message) => (
                        <Paper
                            key={message.id}
                            elevation={3}
                            className={message.isUser ? "userMessage" : "llmMessage"}
                        >
                            <Typography variant="body2">{message.content}</Typography>
                        </Paper>
                    ))}
                    {isThinking && (
                        <Box display="flex" justifyContent="center" alignItems="center" p={2}>
                            <CircularProgress color="primary" size={24} />
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Stack>
            </Box>

            {/* Chat Input Area */}
            <Box className={"inputArea"} p={2} display="flex" justifyContent="space-between">
                <TextField
                    fullWidth
                    size="small"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Enter question..."
                    variant="outlined"
                    disabled={isThinking}
                    className="inputField"
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={isThinking}
                    className="sendButton"
                >
                    <FaPaperPlane />
                </Button>
            </Box>
        </Box>
    );
}