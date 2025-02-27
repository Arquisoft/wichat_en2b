import React, {useState} from 'react';
import "./QuestionGame.css"
const QuestionGame = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const totalQuestions = 10;
    
    // Sample questions 
    const questions = //TODO fetch reponse generator
    [
        {
        id: 1,
        questionText: "¿What is shown in the figure?",
        image: "/api/placeholder/400/320",
        options: ["Response...", "Response...", "Response...", "Response..."]
        },
        // Additional questions would be added here
    ];
    
    const handleOptionSelect = (index) => {
        setSelectedOption(index);
    };
    
    const handleNext = () => {
        if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        } else {
        // TODO: implement finish logic here
        alert("Quiz completed!");
        }
    };
    
    const isLastQuestion = currentQuestion === totalQuestions - 1;
    
    return (
        <div className="quiz-container">
            {/* Blue border at top */}
            <div className="blue-border"></div>
            
            {/* Main content */}
            <div className="content-area">
                {/* Question counter */}
                <div className="question-counter">
                    Question {currentQuestion + 1} of {totalQuestions}
                </div>
                
                {/* Question */}
                <h2 className="question-text">¿What is shown in the figure?</h2>
                
                <div className="flex-container">
                    {/* Image */}
                    <div className="image-container">
                        <img 
                            src="/api/placeholder/400/320" 
                            alt="Question visual" 
                            className="question-image"
                        />
                    </div>
                    
                    {/* Options */}
                    <div className="options-container">
                        {['A', 'B', 'C', 'D'].map((letter, index) => (
                            <div 
                                key={letter}
                                className="option"
                                onClick={() => handleOptionSelect(index)}
                            >
                                <div 
                                    className={`option-letter ${selectedOption === index ? 'selected' : ''}`}
                                >
                                    {letter}
                                </div>
                                <input
                                    type="text"
                                    className="option-input"
                                    placeholder="Response..."
                                    readOnly
                                />
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Next/Finish button */}
                <button 
                    className="next-button"
                    onClick={handleNext}
                >
                    {isLastQuestion ? 'Finish' : 'Next'}
                </button>
            </div>
            
            {/* Blue border at bottom */}
            <div className="blue-border"></div>
        </div>
    );
};


export default QuestionGame;