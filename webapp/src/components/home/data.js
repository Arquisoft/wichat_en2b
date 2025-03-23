export const quizCategories = [
    { id: 1, name: "Science", icon: "🔬", color: "#2196f3", quizCount: 4 },
    { id: 2, name: "History", icon: "🏛️", color: "#ff9800", quizCount: 4 },
    { id: 3, name: "Geography", icon: "🌍", color: "#4caf50", quizCount: 4 },
    { id: 4, name: "Entertainment", icon: "🎬", color: "#9c27b0", quizCount: 4 },
    { id: 5, name: "Sports", icon: "⚽", color: "#f44336", quizCount: 4 },
    { id: 6, name: "Technology", icon: "💻", color: "#3f51b5", quizCount: 4 },
    { id: 7, name: "General Knowledge", icon: "❓", color: "#795548", quizCount: 4 },
];

export const quizzesByCategory = {
    "1": [
        { id: 1, title: "Scientific disciplines", description: "Test your knowledge about scientific disciplines.", question: "What's the discipline shown in the image?", difficulty: "hard", timeEstimate: 60, questions: 10, options: 4, popularity: 6, wikidataCode: "Q336" },
        { id: 2, title: "Weather phenomena", description: "Test your knowledge about weather phenomena.", question: "What's the phenomena shown in the image?", difficulty: "hard", timeEstimate: 40, questions: 10, options: 4, popularity: 6, wikidataCode: "Q336" },
        { id: 3, title: "Scientific instruments", description: "Test your knowledge about scientific instruments.", question: "What's the scientific instrument shown in the image?", difficulty: "hard", timeEstimate: 20, questions: 10, options: 4, popularity: 6, wikidataCode: "Q3099911" },
        { id: 4, title: "Chemical elements", description: "Test your knowledge about chemistry.", question: "What is the chemical element shown in the image?", difficulty: "hell", timeEstimate: 20, questions: 10, options: 4, popularity: 7, wikidataCode: "Q8054" }
    ],
    "2": [
      { id: 1, title: "Ancient Civilizations", description: "Explore ancient Egypt, Greece, and Rome.", question: "Who was the first emperor of Rome?", difficulty: "easy", timeEstimate: 60, questions: 10, options: 4, popularity: 5, wikidataCode: "Q11772" },
      { id: 2, title: "Medieval History", description: "Test your knowledge of medieval Europe.", question: "What year did the Battle of Hastings take place?", difficulty: "medium", timeEstimate: 40, questions: 10, options: 4, popularity: 6, wikidataCode: "Q12554" },
      { id: 3, title: "World War I", description: "Test your knowledge of World War I events.", question: "Which event triggered World War I?", difficulty: "hard", timeEstimate: 20, questions: 10, options: 4, popularity: 7, wikidataCode: "Q361" },
      { id: 4, title: "Modern History", description: "Learn about modern historical events.", question: "When did the Berlin Wall fall?", difficulty: "hell", timeEstimate: 10, questions: 10, options: 4, popularity: 8, wikidataCode: "Q658394" },
    ],
    "3": [
      { id: 1, title: "Continents and Oceans", description: "Learn about the continents and oceans.", question: "Which is the largest ocean on Earth?", difficulty: "easy", timeEstimate: 60, questions: 10, options: 4, popularity: 6, wikidataCode: "Q5107" },
      { id: 2, title: "Countries of the World", description: "Test your knowledge of countries and capitals.", question: "What is the capital of Canada?", difficulty: "medium", timeEstimate: 40, questions: 10, options: 4, popularity: 7, wikidataCode: "Q6256" },
      { id: 3, title: "Geography Facts", description: "Learn interesting geography facts.", question: "What is the longest river in the world?", difficulty: "hard", timeEstimate: 20, questions: 10, options: 4, popularity: 5, wikidataCode: "Q1071" },
      { id: 4, title: "World Wonders", description: "Test your knowledge of the world's wonders.", question: "Where is the Great Wall of China located?", difficulty: "hell", timeEstimate: 10, questions: 10, options: 4, popularity: 6, wikidataCode: "Q19953632" },
    ],
    "4": [
      { id: 1, title: "Movies Trivia", description: "Test your knowledge of popular movies.", question: "Who directed 'Inception'?", difficulty: "easy", timeEstimate: 60, questions: 10, options: 4, popularity: 7, wikidataCode: "Q11424" },
      { id: 2, title: "Music Legends", description: "How much do you know about music legends?", question: "Who is known as the 'King of Pop'?", difficulty: "medium", timeEstimate: 40, questions: 10, options: 4, popularity: 8, wikidataCode: "Q638" },
      { id: 3, title: "TV Shows Quiz", description: "Test your knowledge of TV shows.", question: "What is the longest-running animated TV show?", difficulty: "hard", timeEstimate: 20, questions: 10, options: 4, popularity: 6, wikidataCode: "Q15416" },
      { id: 4, title: "Pop Culture", description: "Test your knowledge of pop culture.", question: "Which artist released the album 'Thriller'?", difficulty: "hell", timeEstimate: 10, questions: 10, options: 4, popularity: 9, wikidataCode: "Q8495" },
    ],
    "5": [
      { id: 1, title: "Football History", description: "Test your knowledge of football history.", question: "Which country won the first FIFA World Cup?", difficulty: "easy", timeEstimate: 60, questions: 10, options: 4, popularity: 9, wikidataCode: "Q2736" },
      { id: 2, title: "Famous Athletes", description: "How much do you know about famous athletes?", question: "Who has won the most Olympic gold medals?", difficulty: "medium", timeEstimate: 40, questions: 10, options: 4, popularity: 6, wikidataCode: "Q2066131" },
      { id: 3, title: "Olympics Trivia", description: "Test your knowledge of the Olympic Games.", question: "In which year were the first modern Olympic Games held?", difficulty: "hard", timeEstimate: 20, questions: 10, options: 4, popularity: 8, wikidataCode: "Q5389" },
      { id: 4, title: "Sports Legends", description: "Test your knowledge of legendary athletes.", question: "Who is considered the greatest basketball player of all time?", difficulty: "hell", timeEstimate: 10, questions: 10, options: 4, popularity: 9, wikidataCode: "Q108434" },
    ],
    "6": [
      { id: 1, title: "Tech Innovations", description: "Test your knowledge of the latest tech innovations.", question: "What is the name of the first smartphone?", difficulty: "easy", timeEstimate: 60, questions: 10, options: 4, popularity: 8, wikidataCode: "Q11661" },
      { id: 2, title: "Programming Basics", description: "Test your knowledge of programming concepts.", question: "Which programming language is known for its use in web development?", difficulty: "medium", timeEstimate: 40, questions: 10, options: 4, popularity: 6, wikidataCode: "Q9143" },
      { id: 3, title: "Gadgets and Devices", description: "Test your knowledge of the latest gadgets and devices.", question: "Which company created the first commercially successful personal computer?", difficulty: "hard", timeEstimate: 20, questions: 10, options: 4, popularity: 7, wikidataCode: "Q1243271" },
      { id: 4, title: "Future Tech", description: "Learn about future technologies.", question: "What technology is expected to revolutionize transportation in the future?", difficulty: "hell", timeEstimate: 10, questions: 10, options: 4, popularity: 9, wikidataCode: "Q11016" },
    ],
    "7": [],
};

export const recentQuizzes = [
    { id: 1, title: "Science Basics", score: 8, total: 10, date: "2 days ago" },
    { id: 2, title: "World Geography", score: 7, total: 10, date: "5 days ago" },
    { id: 3, title: "Pop Culture", score: 9, total: 10, date: "1 week ago" },
];

export const leaderboardData = [
    { rank: 1, name: "JohnDoe", avatar: "JD", score: 9542, quizzes: 124 },
    { rank: 2, name: "QuizWizard", avatar: "QW", score: 8976, quizzes: 118 },
    { rank: 3, name: "BrainKing", avatar: "BK", score: 8245, quizzes: 105 },
    { rank: 12, name: "QuizMaster", avatar: "QM", score: 4872, quizzes: 42, isCurrentUser: true },
];
