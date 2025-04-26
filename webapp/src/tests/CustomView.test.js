import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomView from '../components/home/CustomView';
import QuestionGame from '../components/game/QuestionGame';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('../components/game/QuestionGame', () => {
  return jest.fn(() => <div data-testid="question-game">Question Game Component</div>);
});

// Mock fetch API
global.fetch = jest.fn();

describe('CustomView Component', () => {
  const mockRouter = {
    push: jest.fn()
  };

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    jest.clearAllMocks();
    
    // Default mock response for categories
    global.fetch.mockImplementation((url) => {
      if (url.includes('/quiz')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { category: 'History', quizName: 'World War II', difficulty: 2, wikidataCode: 'Q362', question: 'About WWII' },
            { category: 'Science', quizName: 'Physics', difficulty: 3, wikidataCode: 'Q413', question: 'About Physics' }
          ])
        });
      } else if (url.includes('/question/amount')) {
        return Promise.resolve({
          json: () => Promise.resolve(20)
        });
      } else {
        return Promise.resolve({
          json: () => Promise.resolve([])
        });
      }
    });
  });

  test('renders CustomView component correctly', async () => {
    render(<CustomView />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Customize your quiz!')).toBeInTheDocument();
    
    // Check if form elements are rendered
    expect(screen.getByLabelText(/Select Category:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Per Question/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Number of Questions:/i)).toBeInTheDocument();
    
    // Check if buttons are rendered
    expect(screen.getByText('Start Quiz')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();

    // Wait for categories to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz'));
    });
  });

  test('selecting a category fetches subcategories', async () => {
    render(<CustomView />);
    
    // Wait for categories to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Select a category
    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });
    
    // Verify fetch subcategories is called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz/History'));
    });
  });

  test('form validation works for negative number of questions', async () => {
    render(<CustomView />);
    
    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });
    
    // Set invalid number of questions
    const questionsInput = screen.getByLabelText(/Number of Questions:/i);
    fireEvent.change(questionsInput, { target: { value: '-1' } });
    
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/You cannot enter a negative amount of questions/i)).toBeInTheDocument();
  });

  test('form validation works for big number of questions', async () => {
    render(<CustomView />);
    
    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });
    
    // Set invalid number of questions
    const questionsInput = screen.getByLabelText(/Number of Questions:/i);
    fireEvent.change(questionsInput, { target: { value: '31' } });
    
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/No more than 30 questions are allowed/i)).toBeInTheDocument();
  });

  test('form validation works for number of options', async () => {
    render(<CustomView />);
    
    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });

    // Set invalid number of options
    const optionsInput = screen.getByLabelText(/Number of options per question:/i);
    fireEvent.change(optionsInput, { target: { value: '9' } });
    
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/The valid range of options is from 2–8/i)).toBeInTheDocument();
  });

  test('form validation works for time per question', async () => {
    render(<CustomView />);

    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });
    
    // Set invalid time
    const timeInput = screen.getByLabelText(/Time Per Question/i);
    fireEvent.change(timeInput, { target: { value: '121' } });
    
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/You can only set a time from 1–120 seconds/i)).toBeInTheDocument();
  });

  test('submitting valid form shows QuestionGame component', async () => {
    render(<CustomView />);
    
    // Select a category that's not "custom"
    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });
    
    // Wait for subcategories to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz'));
    });
    
    // Submit the form with valid inputs
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
    
    // Check if QuestionGame component is rendered
    await waitFor(() => {
      expect(screen.getByTestId('question-game')).toBeInTheDocument();
    });
  });

  test('back button navigates to home page', () => {
    render(<CustomView />);
    
    // Click back button
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    
    // Verify router.push was called with correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  test('fetchAvailableQuestions updates state correctly', async () => {
    render(<CustomView />);
    
    // Select a category
    const categorySelect = screen.getByLabelText(/Select Category:/i);
    fireEvent.change(categorySelect, { target: { value: 'History' } });
    
    // Wait for both fetch calls to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/question/amount/'));
    });
    
    // Then submit form with too many questions
    const questionsInput = screen.getByLabelText(/Number of Questions:/i);
    fireEvent.change(questionsInput, { target: { value: '30' } });
    
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
    
    // Should show error about available questions
    expect(screen.getByText(/There are only 20 questions for this quiz/i)).toBeInTheDocument();
  });

  test('form handles API errors gracefully', async () => {
    // Override fetch mock to simulate error
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('API error')));
    
    render(<CustomView />);
    
    // Wait for categories fetch to fail
    await waitFor(() => {
      expect(screen.getByText(/There was an error fetching the categories/i)).toBeInTheDocument();
    });
  });
});