const axios = require('axios');
const express = require('express');
const helmet = require('helmet')

const app = express();

app.use(helmet());

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
      contents: [{ parts: question.content }]
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

// Function to send questions to LLM
async function sendQuestionToLLM(conversation, apiKey, answer, model = 'empathy') {
  try {
    const config = llmConfigs[model];
    if (!config) {
      throw new Error(`Model "${model}" is not supported.`);
    }
    

    const requestData = config.transformRequest(conversation, answer);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(config.headers ? config.headers(apiKey) : {})
    };

    const url = config.url(apiKey);

     const filterWords = answer.answers;  

     let response;
     let llmAnswer;
     let retryCount = 0;
     const maxRetries = 3;

     do {
      if(retryCount>3){
        break;
      }
       response = await axios.post(url, requestData, { headers });
       llmAnswer = config.transformResponse(response);
       retryCount++;

     } while (filterWords.some(word => llmAnswer.toLowerCase().includes(word.toLowerCase())));
     if (retryCount >= maxRetries) {
      return "There was an error while returning your answer, please try again.";
    }

    return llmAnswer;

  } catch (error) {
    console.error(`Error sending question to ${model}:`, error.message || error);
    return null;
  }
}

app.post('/askllm', async (req, res) => {
  try {
    // Check if required fields are present in the request body
    validateRequiredFields(req, ['conversation', 'model', 'possibleAnswers']);
    const {conversation, model, possibleAnswers} = req.body;
    const apiKey=process.env.LLM_API_KEY;
    const llmAnswer = await sendQuestionToLLM(conversation, apiKey, possibleAnswers, model);
    if (llmAnswer) {
      res.json( { role: "assistant", content: llmAnswer });
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
