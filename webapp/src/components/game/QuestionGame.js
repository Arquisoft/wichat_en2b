import React, {useEffect, useState} from 'react';
import "./QuestionGame.css"
const QuestionGame = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState(null)
    const [questionShown, setQuestionShown] = useState(null)
    const [questionImg, setQuestionImg] = useState(null)
    
    const [answerState, setAnswerState] = useState(null); 
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(null);

    const totalQuestions = 4;                            //TODO: unfix this parameters, delegate its assignation value to other layer
    const numberOptions = 4;
    
    const isLastQuestion = currentQuestion === totalQuestions - 1;

    const handleOptionSelect = (index) => {
        setSelectedOption(index);
    };
    
    const handleNext = () => {
        const isCorrect = questionShown && questionShown.correctAnswer === questionShown.options[selectedOption];
        setAnswerState(isCorrect ? 'correct' : 'wrong');

        if (!isCorrect) {
            const correctIndex = questionShown.options.findIndex(
                option => option === questionShown.correctAnswer
            );
            setCorrectAnswerIndex(correctIndex);
        }

        setTimeout(() => {
            if (currentQuestion < totalQuestions - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
            setAnswerState(null);
            } else {
                                                                // TODO: implement finish logic here, save game played,... It should not be done in Presentation Layer 
                alert("Quiz completed!");
            }
        }, 1000);
        
    };

    
    const fetchQuestions = async () => {
        try {
            const response = await fetch(`http://localhost:8000/game/${totalQuestions}/${numberOptions}`);

            if (!response.ok){
                
                console.error("Error when requesting the questions");
                throw new Error("Response was not OK when requesting the questions");
            }

            const questionsJSON = await response.json()

            const formattedQuestions = questionsJSON.map((q,index) => ({
                    id: index,
                    questionText: "What is shown in the image?",                    //TODO: resolve this, it cannot be fixed
                    image: q.image_name,
                    options: q.answers,
                    correctAnswer: q.right_answer
                }));
            
            setQuestions(formattedQuestions);
            setError(null);
        } catch (err) {
            console.error('Error fetching questions:', err);
            setError("There was a problem when requesting the questions. Try again later.") 
        }
    }
    
    useEffect(() => {
        fetchQuestions();
    }, []);

    useEffect(() => {
        const currentQ = questions.find(q => q.id === currentQuestion);
        setQuestionShown(currentQ);
    }, [currentQuestion, questions]);

    useEffect(() => {
        if (questions.length > 0) {
            const currentQ = questions.find(q => q.id === currentQuestion);
            if (currentQ) {
                const imgURL = `http://localhost:8000${currentQ.image}`;
                setQuestionImg(imgURL);
            }
        }
    }, [currentQuestion, questions]);

    if (error && questions.length === 0) {
        return (
            <div className="quiz-container">
                <div className="blue-border"></div>
                <div className="content-area error" data-testid="error-message">
                    <h2>{error}</h2>
                    <button className="next-button" onClick={() => window.location.reload()}>
                        Reintentar
                    </button>
                </div>
                <div className="blue-border"></div>
            </div>
        );
    }
    
    return (
        <div className="quiz-container">
            {/* Blue border at top */}
            <div className="blue-border"></div>
            
            {/* Main content */}
            <div className="content-area">
                {/* Question counter */}
                <div className="question-counter" data-testid="question-counter">
                    Question {currentQuestion + 1} of {totalQuestions}
                </div>
                
                {/* Question */}
                <h2 className="question-text" data-testid="question-text">{questionShown?.questionText}</h2>
                
                <div className="flex-container">
                    {/* Image */}
                    <div className="image-container">
                        <img 
                            src={questionImg}
                            alt="Question image"                            //TODO: change this? for a descriptive one? perhaps from wikidata description 
                            className="question-image"
                            id="q-img"
                        />
                    </div>
                    
                    {/* Options */}
                    <div className="options-container">
                    {questionShown?.options?.map((option, index) => (
                        <button 
                            key={index}
                            className="option"
                            onClick={() => handleOptionSelect(index)}
                            data-state={
                                answerState && (
                                    selectedOption === index ? answerState :
                                    correctAnswerIndex === index ? 'correct-answer' : undefined
                                )
                            }
                        >
                            <div 
                                className={`option-letter ${selectedOption === index ? 'selected' : ''} ${
                                    answerState && (
                                        selectedOption === index ? answerState :
                                        correctAnswerIndex === index ? 'correct-answer' : ''
                                    )
                                }`}
                            >
                                {String.fromCharCode(65 + index)}
                            </div>
                            <input
                                type="text"
                                className={`option-input ${
                                    answerState && (
                                        selectedOption === index ? answerState :
                                        correctAnswerIndex === index ? 'correct-answer' : ''
                                    )
                                }`}
                                placeholder="Response..."
                                value={option}
                                readOnly
                            />
                        </button>
                            ))}
                    </div>
                </div>
                
                {/* Next/Finish button */}
                <button 
                    className="next-button"
                    data-testid="next-button"
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