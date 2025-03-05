// InGameChat.js
import React, { useState, useRef, useEffect } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  IconButton,
  Stack
} from "@mui/material";

export default function InGameChat({ 
  onSendMessage, 
  initialMessages = [],
  width = "300px",
  height = "500px"
}) {
  const [messages, setMessages] = useState(initialMessages.length > 0 ? initialMessages : [
    { id: "1", content: "Welcome to the quiz! Ask for hints if you need help.", isUser: false, type: "welcome" },
  ]);
  
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === "") return;
    
    const newMessage = {
      id: Date.now().toString(),
      content: input,  // Store the actual message text
      isUser: true,
      type: "question"
    };
    
    setMessages([...messages, newMessage]);
    setInput("");
    
    // Call the external handler if provided
    if (onSendMessage) {
      onSendMessage(input);
    }

    try {
      const response = await fetch("http://localhost:8000/askllm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: [{ role: "user", content: input }], 
          model: "empathy", 
          possibleAnswers: { "answers": ["San José", "Lima", "Perugia", "Panama City"], "right_answer": "Panama City" }
        })
      });
      const data = await response.json();
      console.log(data.content);
      if (data.content) {
      const llmMessage = {
        id: Date.now().toString() + "_llm",
        content: data.content, // LLM response text
        isUser: false,
        type: "response"
      };

      setMessages((prevMessages) => [...prevMessages, llmMessage]);
    } else {
      console.error("Invalid LLM response", data);
    }
    } catch (error) {
      console.error("Error fetching LLM response:", error);
  };
}

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Chat Header */}
      <Box 
        sx={{ 
          bgcolor: '#2196f3', 
          color: 'white', 
          p: 1.5, 
          display: 'flex', 
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          Ask for hints
        </Typography>
        <Box sx={{ marginLeft: 'auto' }}>
          <IconButton 
            size="small" 
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
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
        </Box>
      </Box>
      
      {/* Chat Messages - Scrollable */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          p: 2, 
          overflowY: 'auto',
          bgcolor: 'background.paper'
        }}
      >
        <Stack spacing={2}>
          {messages.map((message) => (
            <Box 
              key={message.id} 
              sx={{ 
                display: 'flex', 
                justifyContent: message.isUser ? 'flex-end' : 'flex-start'
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 10,
                  maxWidth: '80%',
                  bgcolor: message.isUser ? '#2196f3' : '#e0e0e0',
                  color: message.isUser ? 'white' : 'text.primary'
                }}
              >
                <Typography variant="body2">
                  {message.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
      </Box>
      
      {/* Chat Input */}
      <Box 
        sx={{ 
          p: 1.5, 
          borderTop: '1px solid #e0e0e0',
          bgcolor: 'background.paper',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter question..."
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendMessage}
            sx={{ minWidth: '36px', px: 2 }}
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
        </Box>
      </Box>
    </Box>
  );
}