import React from "react"
import "../../styles/home/CustomView.css"
import { useRouter } from "next/navigation";
import QuestionGame from "../game/QuestionGame"; 

const { useState, useEffect } = React
const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

function CustomQuiz() {
    const router = useRouter();
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [subcategories, setSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState("");
    const [selectedDifficulty, setSelectedDifficulty] = useState(1);
    const [newCategory, setNewCategory] = useState("");
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [numberOfQuestions, setNumberOfQuestions] = useState(10);
    const [gameMode, setGameMode] = useState("singleplayer");
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(true);
    const [numberOfOptions, setNumberOfOptions] = useState(4);
    const [showGame, setShowGame] = useState(false);
    const [quizData, setQuizData] = useState([]);
    const [error, setError] = useState(null);
    const [numberOfAvailableQuestions, setNumberOfAvailableQuestions] = useState(10);
  
    const mapDifficulty = (level) => {
      switch (level) {
        case 1: return "easy";
        case 2: return "medium";
        case 3: return "hard";
        case 4: return "hard";
        case 5: return "hell";
        default: return "unknown";
      }
    };
    const fetchSubcategories = async (cat) => {
      try {
        const response = await fetch(`${apiEndpoint}/quiz/${cat}`);
        const data = await response.json();

        // Map data to fit frontend expectations
        const mappedQuizzes = data.map((quiz) => ({//NOSONAR
          title: quiz.quizName,
          difficulty: quiz.difficulty,
          wikidataCode: quiz.wikidataCode,
          question: quiz.question,
        }));

        setSubcategories(mappedQuizzes);
        setSelectedSubcategory(mappedQuizzes[0]);
        fetchAvailableQuestions(mappedQuizzes[0].wikidataCode);
      } catch (err) {
        setError("There was an error fetching the quizzes.");
        console.error("Error fetching quizzes", err);
      }
    };

    const fetchAvailableQuestions = async (wikidataCode) => {
      try{
        const response = await fetch(`${apiEndpoint}/question/amount/${wikidataCode}`);
        const data = await response.json();
        setNumberOfAvailableQuestions(data);
      } catch (error){
        setError("There was an error fetching the amount of questions we have");
        console.error("Error fetching available questions: ", error);
      }
    };

    const validFields = () => {
      let tempError = null;
    
      if (showNewCategoryInput && newCategory.trim() === "") {
        tempError = "The new category cannot be empty.";
      } else if (numberOfQuestions <= 0) {
        tempError = "You cannot enter a negative amount of questions.";
      } else if (!showNewCategoryInput && numberOfQuestions > numberOfAvailableQuestions) {
        tempError = `There are only ${numberOfAvailableQuestions} questions for this quiz.`;
      } else if (numberOfOptions < 2 || numberOfOptions > 10) {
        tempError = "The valid range of options is from 2–10.";
      } else if (timePerQuestion < 1 || timePerQuestion > 120) {
        tempError = "You can only set a time from 1–120 seconds.";
      }
    
      setError(tempError);
      return tempError == null;
    };
    

    useEffect(() => {
        setSelectedCategory("custom");
        setSelectedSubcategory("");
        const fetchCategories = async () => {
          try {
            const response = await fetch(`${apiEndpoint}/quiz`);
            const data = await response.json();

            const formattedCategories = Object.values(
              data.reduce((acc, quiz) => {
                const category = quiz.category;
                acc[category] = {
                  name: category,
                };
                return acc;
              }, {})
            );
    
            setCategories(formattedCategories);
          } catch (error) {
            setError("There was an error fetching the categories");
            console.error("Failed to fetch categories:", error);
          }
        };
    
        fetchCategories();
    }, []); 
  
    const handleSubmit = (e) => {
      e.preventDefault();

      if (!validFields()) {
        return;
      }

      const category = showNewCategoryInput ? newCategory : selectedCategory;

      let question = showNewCategoryInput ? "":
        selectedSubcategory.question;
        
      let url = showNewCategoryInput ? 
        `/game/${newCategory}/${numberOfQuestions}/${numberOfOptions}/${question}`:
        `/game/${selectedSubcategory.wikidataCode}/${numberOfQuestions}/${numberOfOptions}`;
      

      let quizData = {
        topic: category, 
        totalQuestions: numberOfQuestions, 
        numberOptions: numberOfOptions, 
        timerDuration: timePerQuestion, 
        question: question,
        fetchQuestionsURL: url,
      };
      setQuizData(quizData);
      setShowGame(true);
    }

    if(showGame){
      return <QuestionGame {...quizData} />;
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
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setShowNewCategoryInput(e.target.value == "custom");
                  if (e.target.value != "custom"){
                    fetchSubcategories(e.target.value);
                  }
                }}
              >
                <option value="custom">Custom category</option>
                {categories.map((category, index) => (
                  <option key={index} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            {!showNewCategoryInput && (
              <>
                <label htmlFor="quiz-select">Select quiz:</label>
                <div className="subcategory-selection">
                  <select
                    id="quiz-select"
                    value={selectedSubcategory.title}
                    onChange={(e) => {
                      const s = subcategories.find(element => element.title == e.target.value);
                      setSelectedSubcategory(s);
                      fetchAvailableQuestions(s.wikidataCode);
                    }}
                    disabled={showNewCategoryInput}
                    >
                    {subcategories.map((quiz, index) => (
                      <option key={index} value={quiz.title}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                </div>
              </>

            )}
          </div>
  
          {showNewCategoryInput && (
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
            <label htmlFor="difficulty-select">Select Difficulty:</label>
            <div className="difficulty-selection">
              <select
                id="difficulty-select"
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                }}
              >
                {showNewCategoryInput && [1, 2, 3, 5].map((i) => (
                  <option key={i} value={i}>
                    {mapDifficulty(i)}
                  </option>
                ))}

                {!showNewCategoryInput && (
                  <option key={selectedSubcategory.difficulty} value={selectedSubcategory.difficulty}>
                    {mapDifficulty(selectedSubcategory.difficulty)}
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="time-per-question">Time Per Question (seconds):</label>
            <input
              type="number"
              id="time-per-question"
              min="1"
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
              min="1"
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(Number.parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="number-of-answers">Number of options per question:</label>
            <input
              type="number"
              id="number-of-answers"
              min="2"
              value={numberOfOptions}
              onChange={(e) => setNumberOfOptions(Number.parseInt(e.target.value))}
            />
          </div>
  
          {error && <p className="error-message">{error}</p>}

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
            onClick={(e) => {
              e.preventDefault();
              router.push("/"); 
            }}
            className="button"
          >
            Back
          </button>
        </form>

      </div>
    )
  }

  export default CustomQuiz;