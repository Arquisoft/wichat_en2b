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
  
    global.fetch.mockImplementation((url) => {
      if (url.endsWith('/quiz')) {
        // Mock response for fetching all categories
        return Promise.resolve({
          json: () => Promise.resolve([
            // Include all categories and at least one quiz per category for structure
            { category: 'History', quizName: 'World War II', difficulty: 2, wikidataCode: 'Q362', question: 'About WWII' },
            { category: 'Science', quizName: 'Physics', difficulty: 3, wikidataCode: 'Q413', question: 'About Physics' }
            // Add more categories here if needed for other tests
          ])
        });
      } else if (url.endsWith('/quiz/History')) {
        // Mock response for fetching quizzes specifically in the 'History' category
        return Promise.resolve({
          json: () => Promise.resolve([
            { category: 'History', quizName: 'World War II', difficulty: 2, wikidataCode: 'Q362', question: 'About WWII' }
            // Add more History quizzes if needed
          ])
        });
      } else if (url.endsWith('/quiz/Science')) {
        // Mock response for fetching quizzes specifically in the 'Science' category
        return Promise.resolve({
          json: () => Promise.resolve([
             { category: 'Science', quizName: 'Physics', difficulty: 3, wikidataCode: 'Q413', question: 'About Physics' }
             // Add more Science quizzes if needed
          ])
        });
      } else if (url.includes('/question/amount/')) {
        // Mock response for fetching available question amount
        // You might make this more dynamic based on the wikidataCode if needed,
        // but for this test, returning 20 is sufficient.
        return Promise.resolve({
          json: () => Promise.resolve(20) // Return a number
        });
      } else {
        // Default response for any other unexpected URLs
        return Promise.resolve({
          json: () => Promise.resolve([])
        });
      }
    });
  });

  test('renders CustomView component correctly', async () => {
    const { container } = render(<CustomView />); // Get the container for querySelector
  
    // Wait for the main title and subheader, which should appear relatively quickly
    await waitFor(() => {
      expect(screen.getByText(/Customize your quiz!/i)).toBeInTheDocument();
      expect(screen.getByText(/Configure your own custom quiz experience./i)).toBeInTheDocument();
    });
  
  
    // Wait for the category select to be loaded and available after fetching categories.
    // Use querySelector by ID as this has been the most reliable in this environment.
    const categorySelectCombobox = await waitFor(() =>
        container.querySelector('#category-select')
    );
    // Also check that the default category text is displayed, confirming data load
    await waitFor(() => {
        expect(categorySelectCombobox).toHaveTextContent('History');
    });
  
  
    // Wait for the other form elements (Time Per Question, Number of Questions) to be available.
    // Use getByLabelText within waitFor for these if it works, or querySelector by ID if needed.
    // Based on previous issues, using querySelector for Number of Questions is safer.
     const timeInput = await waitFor(() =>
        screen.getByLabelText(/Time Per Question/i)
     );
     const questionsInput = await waitFor(() =>
         container.querySelector('#number-of-questions') // Query directly by ID
     );
     const optionsInput = await waitFor(() =>
         container.querySelector('#number-of-answers') // Query directly by ID
     );
  
  
    await waitFor(() => {
        expect(timeInput).toBeInTheDocument();
        expect(questionsInput).toBeInTheDocument();
        expect(optionsInput).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument(); // Updated text matcher
     });
  
    // You might also want to check for the presence of the quiz select (subcategory select)
     const quizSelectCombobox = await waitFor(() =>
         container.querySelector('#quiz-select')
     );
     await waitFor(() => {
         expect(quizSelectCombobox).toBeInTheDocument();
         // And possibly check its initial content, e.g., the first subcategory of History
         expect(quizSelectCombobox).toHaveTextContent('World War II'); // Assuming World War II is the first subcategory of History
     });
  
  });
  test('selecting a category fetches subcategories', async () => {
    const { container } = render(<CustomView />); // Get the container from render
  
    // Wait for the categories to be loaded and the Select element to be available,
    // by querying its stable ID using querySelector.
    const categorySelectCombobox = await waitFor(() =>
      container.querySelector('#category-select') // Query directly by ID
    );
  
    // Clear the mock call history of the fetch mock before simulating the user action.
    // This is important to isolate the fetch call triggered by the category selection.
    global.fetch.mockClear();
  
    // Simulate clicking the select control to open the dropdown.
    fireEvent.mouseDown(categorySelectCombobox); // Use mouseDown for opening selects
  
    // Wait for the dropdown options (MenuItems) to appear and find the "Science" option.
    // We are selecting "Science" to ensure a change from the default "History"
    // which should trigger the fetchSubcategories call.
    const scienceOption = await waitFor(() =>
      screen.getByRole('option', { name: 'Science' })
    );
  
    // Click the "Science" option to select it.
    fireEvent.click(scienceOption);
  
    // Wait for the fetchSubcategories call triggered by selecting "Science"
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz/Science'));
    });
  
    // Note: Although fetchAvailableQuestions is also triggered after fetchSubcategories
    // completes, this specific test only needs to verify the subcategories fetch.
  });

  test('form validation works for negative number of questions', async () => {
    const { container } = render(<CustomView />); // Get the container from render
  
    // Wait for the categories to be loaded and the Select element to be available.
    const categorySelectCombobox = await waitFor(() =>
      container.querySelector('#category-select') // Query directly by ID
    );
  
    // Simulate clicking the select control to open the dropdown.
    fireEvent.mouseDown(categorySelectCombobox); // Use mouseDown for opening selects
  
    // Wait for the dropdown options (MenuItems) to appear and find the "History" option.
    const historyOption = await waitFor(() =>
      screen.getByRole('option', { name: 'History' })
    );
  
    // Click the "History" option to select it.
    fireEvent.click(historyOption);
  
    // Wait for the fetchAvailableQuestions call to complete after selecting the category
    // (This sets the max available questions needed for validation, though for negative
    // validation, the specific count isn't strictly necessary, waiting for the fetch
    // ensures the component is in a stable state).
     await waitFor(() => {
         expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/question/amount/Q362'));
     });
  
  
    // Set invalid number of questions (a negative number)
    const questionsInput = await waitFor(() =>
        container.querySelector('#number-of-questions') // Query directly by ID
    );
  
    fireEvent.change(questionsInput, { target: { value: '-5' } });
  
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
  
    // Check if the correct error message for negative input is displayed.
    await waitFor(() => { // Wait for the error message to appear
        // Updated text matcher to match the actual error message for negative numbers
        expect(screen.getByText(/You cannot enter a negative amount of questions./i)).toBeInTheDocument();
    });
  });

  test('form validation works for big number of questions', async () => {
    const { container } = render(<CustomView />); // Get the container from render
  
    // Wait for the categories to be loaded and the Select element to be available,
    // by querying its stable ID using querySelector.
    const categorySelectCombobox = await waitFor(() =>
      container.querySelector('#category-select') // Query directly by ID
    );
  
    // Simulate clicking the select control to open the dropdown.
    fireEvent.mouseDown(categorySelectCombobox); // Use mouseDown for opening selects
  
    // Wait for the dropdown options (MenuItems) to appear and find the "History" option.
    const historyOption = await waitFor(() =>
      screen.getByRole('option', { name: 'History' })
    );
  
    // Click the "History" option to select it.
    fireEvent.click(historyOption);
  
    // Note: After selecting a category, fetchSubcategories and fetchAvailableQuestions
    // will be triggered. The validation for number of questions depends on the
    // numberOfAvailableQuestions state, which is set by fetchAvailableQuestions.
    // The initial fetchAvailableQuestions for the default category ('History')
    // sets this state. We need to ensure that fetch completes before checking validation.
    // We can explicitly wait for the fetch call here for clarity.
    await waitFor(() => {
        // Expect the fetch call for available questions for the default subcategory of History ('Q362')
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/question/amount/Q362'));
    });
  
  
    // Set invalid number of questions (assuming mock returns 20 available questions)
    // The "Number of Questions" input had timing issues before, query by ID using querySelector.
    const questionsInput = await waitFor(() =>
        container.querySelector('#number-of-questions') // Query directly by ID
    );
  
    fireEvent.change(questionsInput, { target: { value: '30' } }); // 30 > 20
  
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
  
    // Check if error message is displayed
    await waitFor(() => { // Wait for the error message to appear as it's conditional rendering
        expect(screen.getByText(/There are only 20 questions for this quiz/i)).toBeInTheDocument();
    });
  });

  test('form validation works for number of options', async () => {
    const { container } = render(<CustomView />); // Get the container from render
  
    // Wait for the categories to be loaded and the Select element to be available.
    const categorySelectCombobox = await waitFor(() =>
      container.querySelector('#category-select') // Query directly by ID
    );
  
    // Simulate clicking the select control to open the dropdown.
    fireEvent.mouseDown(categorySelectCombobox); // Use mouseDown for opening selects
  
    // Wait for the dropdown options (MenuItems) to appear and find the "History" option.
    const historyOption = await waitFor(() =>
      screen.getByRole('option', { name: 'History' })
    );
  
    // Click the "History" option to select it.
    fireEvent.click(historyOption);
  
    // Note: We are skipping explicit waits for fetches after category selection
    // to keep this test focused on options validation inputs.
  
  
    // Wait for the "Number of Options Per Question" input to be available
    // and query it by its ID using querySelector.
    const optionsInput = await waitFor(() =>
        container.querySelector('#number-of-answers')
    );
  
  
    // Set invalid number of options (e.g., 9, which is outside the 2-8 range)
    fireEvent.change(optionsInput, { target: { value: '9' } });
  
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
  
    // Check if error message is displayed
    await waitFor(() => { // Wait for the error message to appear as it's conditional rendering
        expect(screen.getByText(/The valid range of options is from 2–8/i)).toBeInTheDocument();
    });
  });

  test('form validation works for time per question', async () => {
    const { container } = render(<CustomView />); // Get the container from render
  
    // Wait for the categories to be loaded and the Select element to be available.
    const categorySelectCombobox = await waitFor(() =>
      container.querySelector('#category-select') // Query directly by ID
    );
  
    // Simulate clicking the select control to open the dropdown.
    fireEvent.mouseDown(categorySelectCombobox); // Use mouseDown for opening selects
  
    // Wait for the dropdown options (MenuItems) to appear and find the "History" option.
    // We need to wait for the options to be in the document, they are usually in a portal.
    const historyOption = await waitFor(() =>
      screen.getByRole('option', { name: 'History' })
    );
  
    // Click the "History" option to select it.
    // Although "History" is the default, clicking it simulates user interaction
    // and ensures the component's state and related effects are potentially re-triggered.
    fireEvent.click(historyOption);
  
    // Note: After selecting a category, fetchSubcategories and fetchAvailableQuestions
    // will be triggered. For this test, we don't strictly need to wait for those fetches
    // because we are testing the *form validation* which happens on submit,
    // and the number of available questions (which affects validation) would have been
    // set by the initial render's fetch sequence for the default category.
    // However, adding a small wait here can sometimes help stabilize tests
    // if there are rapid state updates. We'll omit explicit waits for the fetches
    // to keep this test focused on the validation inputs.
  
  
    // Set invalid time
    const timeInput = screen.getByLabelText(/Time Per Question/i);
    fireEvent.change(timeInput, { target: { value: '121' } });
  
    // Submit the form
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
  
    // Check if error message is displayed
    await waitFor(() => { // Wait for the error message to appear as it's conditional rendering
        expect(screen.getByText(/You can only set a time from 1–120 seconds/i)).toBeInTheDocument();
    });
  });

  test('submitting valid form shows QuestionGame component', async () => {
    const { container } = render(<CustomView />); // Get the container from render
  
    // Wait for the categories to be loaded and the Select element to be available,
    // by querying its stable ID using querySelector.
    const categorySelectCombobox = await waitFor(() =>
      container.querySelector('#category-select') // Query directly by ID
    );
  
    // Wait for the default selected category text ("History") to appear.
    // This confirms the initial data load and selection is reflected in the UI.
     await waitFor(() => {
        expect(categorySelectCombobox).toHaveTextContent('History'); // Assuming History is the first category in your mock
     });
  
  
    // Simulate clicking the default selected category ("History") to trigger fetchSubcategories.
    // Although it's already selected, this simulates the user confirming the selection,
    // which triggers the change handler in the component.
    fireEvent.mouseDown(categorySelectCombobox); // Open the dropdown
    // Wait for the default option ("History") to appear in the opened dropdown and click it
    const historyOption = await waitFor(() =>
        screen.getByRole('option', { name: 'History' })
    );
    fireEvent.click(historyOption);
  
  
    // Wait for subcategories to load (triggered by selecting the category)
    await waitFor(() => {
      // Expect the fetch call for subcategories of 'History'
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz/History'));
    });
  
    // (Implicitly, fetchAvailableQuestions for the default subcategory of History is also called here,
    // but this test's focus is on submitting the form, not the fetch details).
  
  
    // Submit the form with valid inputs
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
  
    // Check if QuestionGame component is rendered
    // Wait for the QuestionGame component (identified by data-testid) to appear
    await waitFor(() => {
      expect(screen.getByTestId('question-game')).toBeInTheDocument();
    });
  });

  test('back button navigates to home page', () => {
    render(<CustomView />);
  
    // Click back button
    // Change the text matcher to match the actual button text "Go Back"
    const backButton = screen.getByText(/Go Back/i); // Using a case-insensitive regex
  
    fireEvent.click(backButton);
  
    // Verify router.push was called with correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/guest/home');
  });

  test('fetchAvailableQuestions updates state correctly', async () => {
    const { container } = render(<CustomView />); // Get the container to use querySelector
  
    // --- Wait for initial loading and fetches to complete ---
    // Wait for the component to fetch categories and render the Select.
    // We wait for the combobox role which represents the interactive select element.
    const categorySelectCombobox = await waitFor(() =>
      screen.getByRole('combobox', { name: /Select Category/i, expanded: false }) // Wait for it to be not expanded initially
    );
  
    // Also wait for the initial fetch calls triggered by the component mount
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz')); // Initial category fetch
    });
  
     await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz/History')); // Fetch subcategories for default 'History'
    });
  
     await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/question/amount/Q362')); // Fetch available questions for default 'History' subcategory
    });
  
    // Ensure the combobox displays the default selected category after initial fetches
     await waitFor(() => {
        expect(categorySelectCombobox).toHaveTextContent('History');
     });
  
  
    // --- Clear mocks and simulate user selecting a different category ---
    // Clear the call history of the fetch mock.
    // This lets us assert only the fetches triggered by the user interaction that follows.
    global.fetch.mockClear();
  
    // Simulate clicking the select control to open the dropdown.
    fireEvent.mouseDown(categorySelectCombobox); // Use mouseDown for opening selects
  
    // Wait for the dropdown options (MenuItems) to appear and find the "Science" option.
    const scienceOption = await waitFor(() =>
      screen.getByRole('option', { name: 'Science' })
    );
  
    // Click the "Science" option to select it.
    fireEvent.click(scienceOption);
  
  
    // --- Wait for fetches triggered by selecting "Science" and assert them ---
    // Wait for the fetch for subcategories of 'Science'
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/quiz/Science'));
    });
  
    // Wait for the fetch of available questions for the selected subcategory of 'Science'
    // (which is 'Physics' with wikidataCode 'Q413' in your mock data).
    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/question/amount/Q413'));
    });
  
    // The numberOfAvailableQuestions state should now be updated based on the 'Science' quiz (mocked as 20).
  
  
    // --- Continue with the rest of the test (validation based on available questions) ---
    // Wait for the "Number of Questions" input to be available and query by its ID
    const questionsInput = await waitFor(() =>
        container.querySelector('#number-of-questions')
    );
  
    // Set the number of questions to exceed the available amount (e.g., 30 > 20).
    fireEvent.change(questionsInput, { target: { value: '30' } });
  
    // Submit the form.
    const submitButton = screen.getByText('Start Quiz');
    fireEvent.click(submitButton);
  
    // Check if the validation error message about available questions is displayed.
    await waitFor(() => {
      expect(screen.getByText(/There are only 20 questions for this quiz/i)).toBeInTheDocument();
    });
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