import React from "react"
import "../../styles/home/CustomView.css"

const { useState, useEffect } = React

function CustomQuiz() {
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState("")
    const [newCategory, setNewCategory] = useState("")
    const [timePerQuestion, setTimePerQuestion] = useState(30)
    const [numberOfQuestions, setNumberOfQuestions] = useState(10)
    const [gameMode, setGameMode] = useState("singleplayer")
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  
    useEffect(() => {
      // Fetch categories from the server
        setCategories(["Custom"]);
    }, [])
  
    const handleSubmit = (e) => {
      e.preventDefault()
  
      const quizConfig = {
        category: showNewCategoryInput ? newCategory : selectedCategory,
        timePerQuestion,
        numberOfQuestions,
        gameMode,
      }
  
      console.log("Quiz configuration:", quizConfig)
      // Here you would typically send this data to your backend or start the quiz
      alert("Quiz configuration saved! Ready to start the quiz.")
    }
  
    return (
      <div className="quiz-customizer">
        <h1>Customize your quiz!</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category-select">Select Category:</label>
            <div className="category-selection">
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={showNewCategoryInput}
              >
                <option value="custom">+ Add New Category</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
  
          {selectedCategory.toLowerCase() === "custom" && (
            <div className="form-group new-category">
              <label htmlFor="new-category">Enter New Category:</label>
              <input
                type="text"
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter a new category"
                required
              />
            </div>
          )}
  
          <div className="form-group">
            <label htmlFor="time-per-question">Time Per Question (seconds):</label>
            <input
              type="number"
              id="time-per-question"
              min="5"
              max="120"
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number.parseInt(e.target.value))}
            />
          </div>
  
          <div className="form-group">
            <label htmlFor="number-of-questions">Number of Questions:</label>
            <input
              type="number"
              id="number-of-questions"
              min="5"
              max="50"
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(Number.parseInt(e.target.value))}
            />
          </div>
  
          <div className="form-group">
            <label>Game Mode:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="gameMode"
                  value="singleplayer"
                  checked={gameMode === "singleplayer"}
                  onChange={() => setGameMode("singleplayer")}
                />
                <span>Singleplayer</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="gameMode"
                  value="vsAI"
                  checked={gameMode === "vsAI"}
                  onChange={() => setGameMode("vsAI")}
                />
                <span>Against AI</span>
              </label>
            </div>
          </div>
  
          <button type="submit" className="submit-btn">
            Start Quiz
          </button>
        </form>
      </div>
    )
  }

  export default CustomQuiz;