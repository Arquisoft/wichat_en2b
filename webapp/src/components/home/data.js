// data.js

// Datos de categorías de quizzes
export const quizCategories = [
  { id: 1, name: "Science", icon: "🔬", color: "#2196f3", quizCount: 15 },
  { id: 2, name: "History", icon: "🏛️", color: "#ff9800", quizCount: 12 },
  { id: 3, name: "Geography", icon: "🌍", color: "#4caf50", quizCount: 10 },
  { id: 4, name: "Entertainment", icon: "🎬", color: "#9c27b0", quizCount: 18 },
  { id: 5, name: "Sports", icon: "⚽", color: "#f44336", quizCount: 8 },
  { id: 6, name: "Technology", icon: "💻", color: "#3f51b5", quizCount: 14 },
];

// Datos de quizzes por categoría
export const quizzesByCategory = {
  "1": [
    { id: 1, title: "Science Basics", description: "Test your knowledge of basic science." },
    { id: 2, title: "Physics 101", description: "Test your knowledge of physics." },
    { id: 3, title: "Chemistry 101", description: "Test your knowledge of basic chemistry." },
    { id: 4, title: "Biology Basics", description: "Test your knowledge of biology." },
    { id: 5, title: "Astronomy 101", description: "Test your knowledge of space and planets." },
  ],
  "2": [
    { id: 1, title: "Ancient Civilizations", description: "Explore ancient Egypt, Greece, and Rome." },
    { id: 2, title: "Medieval History", description: "Test your knowledge of medieval Europe." },
    { id: 3, title: "World War I", description: "Test your knowledge of World War I events." },
    { id: 4, title: "World War II", description: "Test your knowledge of World War II events." },
  ],
  "3": [
    { id: 1, title: "Continents and Oceans", description: "Learn about the continents and oceans." },
    { id: 2, title: "Countries of the World", description: "Test your knowledge of countries and capitals." },
    { id: 3, title: "Geography Facts", description: "Learn interesting geography facts." },
  ],
  "4": [
    { id: 1, title: "Movies Trivia", description: "Test your knowledge of popular movies." },
    { id: 2, title: "Music Legends", description: "How much do you know about music legends?" },
    { id: 3, title: "TV Shows Quiz", description: "Test your knowledge of TV shows." },
    { id: 4, title: "Video Games Trivia", description: "Test your knowledge of video games." },
  ],
  "5": [
    { id: 1, title: "Football History", description: "Test your knowledge of football history." },
    { id: 2, title: "Famous Athletes", description: "How much do you know about famous athletes?" },
    { id: 3, title: "Olympics Trivia", description: "Test your knowledge of the Olympic Games." },
  ],
  "6": [
    { id: 1, title: "Tech Innovations", description: "Test your knowledge of the latest tech innovations." },
    { id: 2, title: "Programming Basics", description: "Test your knowledge of programming concepts." },
    { id: 3, title: "Gadgets and Devices", description: "Test your knowledge of the latest gadgets and devices." },
  ],
};

// Datos recientes de quizzes (por ejemplo, un historial de quizzes jugados)
export const recentQuizzes = [
  { id: 1, title: "Science Basics", score: 8, total: 10, date: "2 days ago" },
  { id: 2, title: "World Geography", score: 7, total: 10, date: "5 days ago" },
  { id: 3, title: "Pop Culture", score: 9, total: 10, date: "1 week ago" },
];

// Datos del leaderboard (tabla de clasificaciones)
export const leaderboardData = [
  { rank: 1, name: "JohnDoe", avatar: "JD", score: 9542, quizzes: 124 },
  { rank: 2, name: "QuizWizard", avatar: "QW", score: 8976, quizzes: 118 },
  { rank: 3, name: "BrainKing", avatar: "BK", score: 8245, quizzes: 105 },
  { rank: 12, name: "QuizMaster", avatar: "QM", score: 4872, quizzes: 42, isCurrentUser: true },
];
