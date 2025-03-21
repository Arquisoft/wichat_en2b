import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import QuestionGame from "@/components/game/QuestionGame";

// Enable fetch mocking
fetchMock.enableMocks();

describe('QuestionGame component', () => {
    beforeEach(() => {
        fetchMock.resetMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const mockQuestions = [
        {
            image_name: '/images/sample1.jpg',
            answers: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            right_answer: 'Option 1'
        },
        {
            image_name: '/images/sample2.jpg',
            answers: ['A', 'B', 'C', 'D'],
            right_answer: 'B'
        }
    ];

    it('fetches and displays questions correctly', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        render(<QuestionGame topic="test" totalQuestions={2} numberOptions={4} timerDuration={30} />);

        await waitFor(() => expect(screen.getByText(/Question 1 of/)).toBeInTheDocument());
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8000/images/sample1.jpg');
    });

    it("displays an error message when fetching questions fails", async () => {
        // Mock console.error before calling the component
        const consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {});

        // Mock the API call to reject
        fetchMock.mockReject(new Error("Failed to fetch"));

        render(<QuestionGame topic="test" totalQuestions={2} numberOptions={4} timerDuration={30} />);

        // Ensure console.error was called
        await waitFor(() => {
            expect(consoleErrorMock).toHaveBeenCalled();
        });

        // Clean up the mock
        consoleErrorMock.mockRestore();
    });

    it('handles option selection and moves to the next question', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        render(<QuestionGame topic="test" totalQuestions={2} numberOptions={4} timerDuration={30} />);

        await waitFor(() => screen.getByText(/Question 1 of/));

        fireEvent.click(screen.getByText('Option 1'));
        expect(screen.getByText('Great job! You got it right!')).toBeInTheDocument();

        act(() => jest.advanceTimersByTime(2000));
        await waitFor(() => screen.getByText(/Question 2 of/));
    });

    it('handles incorrect option selection', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        render(<QuestionGame topic="test" totalQuestions={2} numberOptions={4} timerDuration={30} />);

        await waitFor(() => screen.getByText(/Question 1 of/));

        fireEvent.click(screen.getByText('Option 2'));
        expect(screen.getByText(/Oops! You didn't guess this one./)).toBeInTheDocument();
    });

    it('displays final results at the end of the game', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        render(<QuestionGame topic="test" totalQuestions={2} numberOptions={4} timerDuration={30} />);

        await waitFor(() => screen.getByText(/Question 1 of/));
        fireEvent.click(screen.getByText('Option 1'));
        // A bit more than 2 seconds so that the next question is loaded before checking
        act(() => jest.advanceTimersByTime(2050));

        await waitFor(() => screen.getByText(/Question 2 of/));
        fireEvent.click(screen.getByText('B'));
        // A bit more than 2 seconds so that the next question is loaded before checking
        act(() => jest.advanceTimersByTime(2050));

        await waitFor(() => screen.getByText('Quiz Completed!'));
        expect(screen.getByText(/100% Correct/)).toBeInTheDocument();
        expect(screen.getByText(/2\/2/)).toBeInTheDocument();
    });
});
