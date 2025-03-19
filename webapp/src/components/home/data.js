export const quizCategories = [
  { id: 1, name: "Science", icon: "🔬", color: "#2196f3", quizCount: 3 },
  { id: 2, name: "History", icon: "🏛️", color: "#ff9800", quizCount: 3 },
  { id: 3, name: "Geography", icon: "🌍", color: "#4caf50", quizCount: 3 },
  { id: 4, name: "Entertainment", icon: "🎬", color: "#9c27b0", quizCount: 3 },
  { id: 5, name: "Sports", icon: "⚽", color: "#f44336", quizCount: 3 },
  { id: 6, name: "Technology", icon: "💻", color: "#3f51b5", quizCount: 3 },
];

export const quizzesByCategory = {
  "1": [
    { id: 1, title: "Science Basics", description: "Test your knowledge of basic science.", difficulty: "easy", timeEstimate: 60, questions: 5, popularity: 8 },
    { id: 2, title: "Physics 101", description: "Test your knowledge of physics.", difficulty: "medium", timeEstimate: 40, questions: 5, popularity: 6 },
    { id: 3, title: "Chemistry 101", description: "Test your knowledge of basic chemistry.", difficulty: "hard", timeEstimate: 20, questions: 5, popularity: 7 },
    { id: 4, title: "Advanced Chemistry", description: "Get into advanced chemistry topics.", difficulty: "hell", timeEstimate: 10, questions: 5, popularity: 9 },
  ],
  "2": [
    { id: 1, title: "Ancient Civilizations", description: "Explore ancient Egypt, Greece, and Rome.", difficulty: "easy", timeEstimate: 60, questions: 5, popularity: 5 },
    { id: 2, title: "Medieval History", description: "Test your knowledge of medieval Europe.", difficulty: "medium", timeEstimate: 40, questions: 5, popularity: 6 },
    { id: 3, title: "World War I", description: "Test your knowledge of World War I events.", difficulty: "hard", timeEstimate: 20, questions: 5, popularity: 7 },
    { id: 4, title: "Modern History", description: "Learn about modern historical events.", difficulty: "hell", timeEstimate: 10, questions: 5, popularity: 8 },
  ],
  "3": [
    { id: 1, title: "Continents and Oceans", description: "Learn about the continents and oceans.", difficulty: "easy", timeEstimate: 60, questions: 5, popularity: 6 },
    { id: 2, title: "Countries of the World", description: "Test your knowledge of countries and capitals.", difficulty: "medium", timeEstimate: 40, questions: 5, popularity: 7 },
    { id: 3, title: "Geography Facts", description: "Learn interesting geography facts.", difficulty: "hard", timeEstimate: 20, questions: 5, popularity: 5 },
    { id: 4, title: "World Wonders", description: "Test your knowledge of the world's wonders.", difficulty: "hell", timeEstimate: 10, questions: 5, popularity: 6 },
  ],
  "4": [
    { id: 1, title: "Movies Trivia", description: "Test your knowledge of popular movies.", difficulty: "easy", timeEstimate: 60, questions: 5, popularity: 7 },
    { id: 2, title: "Music Legends", description: "How much do you know about music legends?", difficulty: "medium", timeEstimate: 40, questions: 5, popularity: 8 },
    { id: 3, title: "TV Shows Quiz", description: "Test your knowledge of TV shows.", difficulty: "hard", timeEstimate: 20, questions: 5, popularity: 6 },
    { id: 4, title: "Pop Culture", description: "Test your knowledge of pop culture.", difficulty: "hell", timeEstimate: 10, questions: 5, popularity: 9 },
  ],
  "5": [
    { id: 1, title: "Football History", description: "Test your knowledge of football history.", difficulty: "easy", timeEstimate: 60, questions: 5, popularity: 9 },
    { id: 2, title: "Famous Athletes", description: "How much do you know about famous athletes?", difficulty: "medium", timeEstimate: 40, questions: 5, popularity: 6 },
    { id: 3, title: "Olympics Trivia", description: "Test your knowledge of the Olympic Games.", difficulty: "hard", timeEstimate: 20, questions: 5, popularity: 8 },
    { id: 4, title: "Sports Legends", description: "Test your knowledge of legendary athletes.", difficulty: "hell", timeEstimate: 10, questions: 5, popularity: 9 },
  ],
  "6": [
    { id: 1, title: "Tech Innovations", description: "Test your knowledge of the latest tech innovations.", difficulty: "easy", timeEstimate: 60, questions: 5, popularity: 8 },
    { id: 2, title: "Programming Basics", description: "Test your knowledge of programming concepts.", difficulty: "medium", timeEstimate: 40, questions: 5, popularity: 6 },
    { id: 3, title: "Gadgets and Devices", description: "Test your knowledge of the latest gadgets and devices.", difficulty: "hard", timeEstimate: 20, questions: 5, popularity: 7 },
    { id: 4, title: "Future Tech", description: "Learn about future technologies.", difficulty: "hell", timeEstimate: 10, questions: 5, popularity: 9 },
  ],
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
