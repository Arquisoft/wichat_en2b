import React from "react";
import {render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import HomePage from "../components/home/HomeViewPage";
import Navbar from "../components/home/ui/Navbar";

describe("HomePage Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
    });

    test("renders the HomePage component correctly", () => {
        render(<HomePage />);
        
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();
        expect(screen.getByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();
        expect(screen.getByText("Play")).toBeInTheDocument();
        expect(screen.getByText("Stats")).toBeInTheDocument();
        expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    });

    test("changes tabs when clicked", () => {
        render(<HomePage />);
        
        expect(screen.getByText("Play")).toBeInTheDocument();
        expect(screen.queryByText("Stats")).toBeInTheDocument();
        expect(screen.queryByText("Leaderboard")).toBeInTheDocument();
        
        act(() => { fireEvent.click(screen.getByText("Stats")); });
        jest.advanceTimersByTime(0);
        expect(screen.getByText("Recent Quizzes")).toBeInTheDocument();
        
        act(() => { fireEvent.click(screen.getByText("Leaderboard")); });
        jest.advanceTimersByTime(0);
        expect(screen.getByText("#1")).toBeInTheDocument();
    });

    test("renders the footer with the current year", () => {
        render(<HomePage />);
        
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(`© ${currentYear} WiChat. All rights reserved.`)).toBeInTheDocument();
    });

    test("navbar renders correctly", () => {
        render(<HomePage />);
        expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    test("navbar opens profile dialog when profile button is clicked", () => {
        render(<Navbar username="testUser" />);
        
        expect(screen.queryByText("Account")).not.toBeInTheDocument();
        act(() => { fireEvent.click(screen.getByText("Profile")) });
        jest.advanceTimersByTime(0);
        expect(screen.getByText("Account")).toBeInTheDocument();
    });

    test("navbar closes profile dialog when save button is clicked", async () => {
        render(<Navbar username="testUser" />);
        
        act(() => { fireEvent.click(screen.getByText("Profile")); });
        expect(screen.getByText("Account")).toBeInTheDocument();
        
        act(() => { fireEvent.click(screen.getByText("Edit")); });
        jest.advanceTimersByTime(0);
        expect(screen.getByText("Account")).toBeInTheDocument();

        act(() => { fireEvent.click(screen.getByText("Save"));});
        jest.advanceTimersByTime(0);
        
        await waitFor(() => {
            expect(screen.queryByText("Account")).not.toBeInTheDocument();
        });
    });

    test("redirects to login page when logout button is clicked", () => { 
        render(<Navbar username="testUser" />);

        act(() => { fireEvent.click(screen.getByLabelText("logout")); });
        expect(screen.queryByText("Login")).not.toBeInTheDocument();

    });
});
