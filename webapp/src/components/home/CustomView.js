import React from "react"
import "../../styles/home/CustomView.css"
import { useRouter } from "next/navigation";

const { useState, useEffect } = React

function CustomQuiz() {
    const router = useRouter();
    const [categories, setCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState("")
    const [newCategory, setNewCategory] = useState("")
    const [timePerQuestion, setTimePerQuestion] = useState(30)
    const [numberOfQuestions, setNumberOfQuestions] = useState(10)
    const [gameMode, setGameMode] = useState("singleplayer")
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
    const [numberOfAnswers, setNumberOfAnswers] = useState(4);
  
    useEffect(() => {
      // Fetch categories from the server
        setCategories(["Patata", "Geografía"]);
        setSelectedCategory("custom");
    }, [])
  
    const handleSubmit = (e) => {
      e.preventDefault()
  
      const category = showNewCategoryInput ? newCategory : selectedCategory
      
  
      console.log("Quiz configuration:", quizConfig)
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
                <option value="custom">Custom category</option>
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
            <p>⚠️ Disclaimer: these quizes will be AI generated so they will not contain images and will take some time!</p>
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
            <label htmlFor="number-of-answers">Number of answers per question:</label>
            <input
              type="number"
              id="number-of-answers"
              min="2"
              max="10"
              value={numberOfAnswers}
              onChange={(e) => setNumberOfAnswers(Number.parseInt(e.target.value))}
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
                  disabled
                />
                <span>Against AI (Coming soon...)</span>
              </label>
            </div>
          </div>
  
          <button type="submit" className="button">
            Start Quiz
          </button>
        </form>

        <form>
          <button
            onClick={() => {router.push("/")}}
            className="button"
          >
            Back
          </button>
        </form>

      </div>
    )
  }

  export default CustomQuiz;