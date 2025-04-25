import React from 'react';
import {render, fireEvent, screen, waitFor, act} from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import QuestionGame from "@/components/game/QuestionGame";
import {MemoryRouterProvider} from 'next-router-mock/MemoryRouterProvider';
import {useRouter} from 'next/navigation';

jest.mock('next/navigation', () => require('next-router-mock'));

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
            question_id: '1'
        },
        {
            image_name: '/images/sample2.jpg',
            answers: ['A', 'B', 'C', 'D'],
            question_id: '2'
        }
    ];

    it('fetches and displays questions correctly', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        render(<QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={30}/>);

        await waitFor(() => expect(screen.getByText(/Question 1 of/)).toBeInTheDocument());
        expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8000/images/sample1.jpg');
    });

    it("displays an error message when fetching questions fails", async () => {
        // Mock console.error before calling the component
        const consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {
        });

        // Mock the API call to reject
        fetchMock.mockReject(new Error("Failed to fetch"));

        render(<QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={30}/>);

        // Ensure console.error was called
        await waitFor(() => {
            expect(consoleErrorMock).toHaveBeenCalled();
        });

        // Clean up the mock
        consoleErrorMock.mockRestore();
    });

    it('handles option selection and moves to the next question', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        fetchMock.mockResponseOnce(JSON.stringify({isCorrect: true, correctAnswer: null}));

        render(<QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={30}/>);

        await waitFor(() => screen.getByText(/Question 1 of/));

        fireEvent.click(screen.getByText('Option 1'));
        await waitFor(() => expect(screen.getByText('Great job! You got it right!')).toBeInTheDocument());

        act(() => jest.advanceTimersByTime(2000));
        await waitFor(() => screen.getByText(/Question 2 of/));
    });

    it('handles incorrect option selection', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        fetchMock.mockResponseOnce(JSON.stringify({isCorrect: false, correctAnswer: 'Option 1'}));

        render(<QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={30}/>);

        await waitFor(() => screen.getByText(/Question 1 of/));

        fireEvent.click(screen.getByText('Option 2'));
        await waitFor(() => expect(screen.getByText(/Oops! You didn't guess this one./)).toBeInTheDocument());
    });

    it('displays final results at the end of the game', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));

        render(<MemoryRouterProvider>
            <QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={30}/>
        </MemoryRouterProvider>);

        await waitFor(() => screen.getByText(/Question 1 of/));

        fetchMock.mockResponseOnce(JSON.stringify({isCorrect: true, correctAnswer: null}));
        fireEvent.click(screen.getByText('Option 1'));
        // A bit more than 2 seconds so that the next question is loaded before checking
        await waitFor(() => screen.getByText('Great job! You got it right!'));
        act(() => jest.advanceTimersByTime(2050));

        fetchMock.mockResponseOnce(JSON.stringify({isCorrect: true, correctAnswer: null}));

        await waitFor(() => screen.getByText(/Question 2 of/));
        fireEvent.click(screen.getByText('B'));
        // A bit more than 2 seconds so that the next question is loaded before checking
        await waitFor(() => screen.getByText('Great job! You got it right!'));
        act(() => jest.advanceTimersByTime(2050));

        await waitFor(() => screen.getByText('Quiz Completed!'));
        expect(screen.getByText(/100% Correct/)).toBeInTheDocument();
        expect(screen.getByText(/2\/2/)).toBeInTheDocument();
    });

    it('handles the timer running out', async () => {
        jest.useFakeTimers(); // Enable fake timers
        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));
        fetchMock.mockResponseOnce(JSON.stringify({isCorrect: false, correctAnswer: 'Option 1'}));
        render(<QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={5}/>);

        // Wait for the first question to appear
        await waitFor(() => screen.getByText(/Question 1 of/));

        // Wait for the next question to appear, confirming the state has updated
        await waitFor(() => screen.getByText(/Question 2 of/), {timeout: 8000, interval: 10});

        jest.useRealTimers(); // Restore real timers after the test
    }, 10000);

    it('restarts the game when "Play again" is clicked', async () => {
        fetchMock
            .mockResponseOnce(JSON.stringify(mockQuestions))
            .mockResponseOnce(JSON.stringify({isCorrect: true, correctAnswer: null}))
            .mockResponseOnce(JSON.stringify({isCorrect: true, correctAnswer: null}))
            .mockResponseOnce(JSON.stringify({})) // Save game results mock
            .mockResponseOnce(JSON.stringify(mockQuestions));

        render(<MemoryRouterProvider><QuestionGame topic="1" fetchQuestionsURL="/game/test/2/4" totalQuestions={2} numberOptions={4} timerDuration={30}/></MemoryRouterProvider>);

        await waitFor(() => screen.getByText(/Question 1 of/));
        fireEvent.click(screen.getByText('Option 1'));
        await waitFor(() => screen.getByText('Great job! You got it right!'));
        act(() => jest.advanceTimersByTime(2050));

        await waitFor(() => screen.getByText(/Question 2 of/));
        fireEvent.click(screen.getByText('B'));
        await waitFor(() => screen.getByText('Great job! You got it right!'));
        act(() => jest.advanceTimersByTime(2050));

        await waitFor(() => screen.getByText('Quiz Completed!'));
        fireEvent.click(screen.getByText('Play again'));

        await waitFor(() => screen.getByText(/Question 1 of/));
    });
});
