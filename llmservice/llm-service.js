const axios = require('axios');
const express = require('express');

const app = express();
const port = 8003;

// Store conversations by user or session ID (in memory)
const conversations = {};

// Middleware to parse JSON in request body
app.use(express.json());

// Define configurations for different LLM APIs
const llmConfigs = {
  gemini: {
    url: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    transformRequest: (question) => ({
      contents: [{ parts: [{ text: question }] }]
    }),
    transformResponse: (response) => response.data.candidates[0]?.content?.parts[0]?.text
  },
  empathy: {
    url: () => 'https://empathyai.prod.empathy.co/v1/chat/completions',
    transformRequest: (messages, answer) => ({
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      messages: [
        { 
          role: "system", 
          content: "You are an assistant designed to help players during a quiz game. When a player asks for a hint, "
            + "you will provide a helpful clue related to the question, but not the full answer."
            + " The possible answers are: " + answer.answers.join(",") + "."
            + " The right answer is: " + answer.right_answer + "."
            + " You will never give the correct answer."
        },
        ...messages 
      ]
    }),
    transformResponse: (response) => response.data.choices[0]?.message?.content,
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  }
};

// Function to validate required fields in the request body
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

// Generic function to send questions to LLM
async function sendQuestionToLLM(userId, question, apiKey, model = 'empathy', answer) {
  try {
    const config = llmConfigs[model];
    if (!config) {
      throw new Error(`Model "${model}" is not supported.`);
    }

    // Ensure each user has their own conversation history
    if (!conversations[userId]) {
      conversations[userId] = []; // Initialize conversation history for the user
    }

    // Push the new user message to the conversation history
    conversations[userId].push({ role: "user", content: question });

    // Prepare the request data with the user's conversation history
    const requestData = config.transformRequest(conversations[userId], answer);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(config.headers ? config.headers(apiKey) : {})
    };

    // Make the request to the LLM API
    const url = config.url(apiKey);
    const response = await axios.post(url, requestData, { headers });
    
    // Get the assistant's response and update the conversation history
    const llmAnswer = config.transformResponse(response);
    conversations[userId].push({ role: "assistant", content: llmAnswer });

    return llmAnswer;

  } catch (error) {
    console.error(`Error sending question to ${model}:`, error.message || error);
    return null;
  }
}

app.post('/askllm', async (req, res) => {
  try {
    // Check if required fields are present in the request body
    validateRequiredFields(req, ['question', 'model', 'apiKey']);
    const { question, model, apiKey, answer} = req.body;
    userId=0;
    const llmAnswer = await sendQuestionToLLM(userId, question, apiKey, model, answer);
    if (llmAnswer) {
      res.json({ llmAnswer });
    } else {
      res.status(500).json({ error: 'Failed to get a valid response from LLM' });
    }

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const server = app.listen(port, () => {
  console.log(`LLM Service listening at http://localhost:${port}`);
});

module.exports = server;
