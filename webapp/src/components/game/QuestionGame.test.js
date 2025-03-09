import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import QuestionGame from './QuestionGame';

// Enable fetch mocking
fetchMock.enableMocks();

describe('QuestionGame component', () => {
    beforeEach(() => {
        fetchMock.resetMocks();

        // Silence console.error during tests to keep output clean
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('should fetch and display questions correctly', async () => {
        const mockQuestions = [
            {
                id: 0,
                questionText: "What is shown in the image?",
                image_name: "/images/sample1.jpg",
                answers: ["Option 1", "Option 2", "Option 3", "Option 4"],
                right_answer: "Option 1"
            }
        ];

        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));

        render(<QuestionGame />);

        await waitFor(() => {
            expect(screen.getByText(/Question 1 of/)).toBeInTheDocument();
            expect(screen.getByTestId('question-text')).toBeInTheDocument();
        });

        await waitFor(() => {
            mockQuestions[0].answers.forEach(answer => {
                const option = screen.getByDisplayValue(answer);
                expect(option).toBeInTheDocument();
            });
        });
    });

    it('should handle error when fetching questions', async () => {
        fetchMock.mockReject(new Error('An error occurred'));

        render(<QuestionGame />);
        
        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toBeInTheDocument();
        });
    });

    it('should handle option selection and next button click', async () => {
        const mockQuestions = [
            {
                id: 0,
                questionText: "What is shown in the image?",
                image_name: "/images/sample1.jpg",
                answers: ["Option 1", "Option 2", "Option 3", "Option 4"],
                right_answer: "Option 1"
            },
            {
                id: 1,
                questionText: "What is shown in the image?",
                image_name: "/images/sample2.jpg",
                answers: ["Option A", "Option B", "Option C", "Option D"],
                right_answer: "Option B"
            },
            {
                id: 1,
                questionText: "What is shown in the image?",
                image_name: "/images/sample2.jpg",
                answers: ["Option A", "Option B", "Option C", "Option D"],
                right_answer: "Option B"
            },
            {
                id: 1,
                questionText: "What is shown in the image?",
                image_name: "/images/sample2.jpg",
                answers: ["Option A", "Option B", "Option C", "Option D"],
                right_answer: "Option B"
            }
        ];

        fetchMock.mockResponseOnce(JSON.stringify(mockQuestions));

        render(<QuestionGame />);

        for (let i=0 ; i < 3 ; i++) {
            await waitFor(() => {
                expect(screen.getByText(/Question/)).toBeInTheDocument();
                mockQuestions[i].answers.forEach(answer => {
                    const option = screen.getByDisplayValue(answer);
                    expect(option).toBeInTheDocument();
                });
            });
    
            fireEvent.click(screen.getByDisplayValue(mockQuestions[i].answers[0]));
    
            fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        }

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Finish/i })).toBeInTheDocument();
        });
    });
});