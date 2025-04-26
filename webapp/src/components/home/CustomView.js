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
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [numberOfQuestions, setNumberOfQuestions] = useState(10);
    const [gameMode, setGameMode] = useState("singleplayer");
    const [numberOfOptions, setNumberOfOptions] = useState(4);
    const [showGame, setShowGame] = useState(false);
    const [quizData, setQuizData] = useState([]);
    const [error, setError] = useState(null);
    const [numberOfAvailableQuestions, setNumberOfAvailableQuestions] = useState(10);
  
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
      if (numberOfQuestions <= 0) {
        tempError = "You cannot enter a negative amount of questions.";
      } else if (numberOfQuestions > 30) {
        tempError = "No more than 30 questions are allowed";
      } else if (numberOfQuestions > numberOfAvailableQuestions) {
        tempError = `There are only ${numberOfAvailableQuestions} questions for this quiz.`;
      } else if (numberOfOptions < 2 || numberOfOptions > 8) {
        tempError = "The valid range of options is from 2–8.";
      } else if (timePerQuestion < 1 || timePerQuestion > 120) {
        tempError = "You can only set a time from 1–120 seconds.";
      }
    
      setError(tempError);
      return tempError == null;
    };
    

    useEffect(() => {
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
            setSelectedCategory(formattedCategories[0].name);
            await fetchSubcategories(formattedCategories[0].name);
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

      let quizData = {
        topic: selectedCategory, 
        totalQuestions: numberOfQuestions, 
        numberOptions: numberOfOptions, 
        timerDuration: timePerQuestion, 
        question: selectedSubcategory.question,
        fetchQuestionsURL: `/game/${selectedSubcategory.wikidataCode}/${numberOfQuestions}/${numberOfOptions}`,
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
                  fetchSubcategories(e.target.value);
                }}
              >
                {categories.map((category, index) => (
                  <option key={index} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
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
                  >

                  {subcategories.map((quiz, index) => (
                    <option key={index} value={quiz.title}>
                      {quiz.title}
                    </option>
                  ))}
                </select>
              </div>
            </>
          </div>
  
          <div className="form-group">
            <label htmlFor="time-per-question">Time Per Question (seconds):</label>
            <input
              type="number"
              id="time-per-question"
              min="1"
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number.parseInt(e.target.value))}
            />
          </div>
  
          <div className="form-group">
            <label htmlFor="number-of-questions">Number of Questions:</label>
            <input
              type="number"
              id="number-of-questions"
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