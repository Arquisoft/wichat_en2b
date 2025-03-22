import React from "react";
import PropTypes from "prop-types";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePage from "../components/home/HomeViewPage";
import { useRouter } from "next/router";

// Mock of the useRouter hook
jest.mock("next/router", () => ({
    useRouter: jest.fn(),
}));
  
// Mock of the components used in HomePage
jest.mock("../components/home/ui/Navbar", () => () => 
    <div data-testid="navbar">Navbar</div>);

jest.mock("../components/home/ui/PlayTab", () => () =>  
    <div data-testid="play-tab">PlayTab Content</div>);

jest.mock("../components/home/ui/StatsTab", () => {
    const MockStatsTab = ({ recentQuizzes }) => (
        <div data-testid="stats-tab">{recentQuizzes ? "StatsTab Content" : "No Data"}</div>
    );
    MockStatsTab.propTypes = { recentQuizzes: PropTypes.array };
    return MockStatsTab;
});

jest.mock("../components/home/ui/LeaderboardTab", () => {
    const MockLeaderboardTab = ({ leaderboardData }) => (
        <div data-testid="leaderboard-tab">{leaderboardData ? "LeaderboardTab Content" : "No Data"}</div>
    );
    MockLeaderboardTab.propTypes = { leaderboardData: PropTypes.array };
    return MockLeaderboardTab;
});

jest.mock("../components/home/ui/StatisticsCard", () => {
    const MockStatisticsCard = ({ stats }) => (
        <div data-testid="statistics-card">{stats ? "Statistics Card" : "No Data"}</div>
    );
    MockStatisticsCard.propTypes = { stats: PropTypes.object };
    return MockStatisticsCard;
});

describe("HomePage Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test("renders the HomePage component correctly", () => {
        render(<HomePage />);
        
        expect(screen.getByTestId("navbar")).toBeInTheDocument();
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();
        expect(screen.getByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();
        expect(screen.getByTestId("statistics-card")).toBeInTheDocument();
        expect(screen.getByTestId("play-tab")).toBeInTheDocument();
    });

    test("changes tabs when clicked", () => {
        render(<HomePage />);
        
        expect(screen.getByTestId("play-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();
        
        fireEvent.click(screen.getByText("Stats"));
        jest.advanceTimersByTime(0);
        expect(screen.getByTestId("stats-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("play-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();
        
        fireEvent.click(screen.getByText("Leaderboard"));
        jest.advanceTimersByTime(0);
        expect(screen.getByTestId("leaderboard-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("play-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
    });

    test("renders the footer with the current year", () => {
        render(<HomePage />);
        
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(`© ${currentYear} WiChat. All rights reserved.`)).toBeInTheDocument();
    });

    test("does not render the HomePage components if data is missing", () => {
        render(<HomePage />);
    
        expect(screen.queryByTestId("navbar")).toBeInTheDocument();
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();
        expect(screen.queryByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();
        expect(screen.queryByTestId("statistics-card")).toBeInTheDocument();
    
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();
    });

    test("navbar renders correctly", () => {
        render(<HomePage />);

        expect(screen.getByText("WiChat")).toBeInTheDocument();
        expect(screen.getByText("Profile")).toBeInTheDocument();
        expect(screen.getByRole("link")).toBeInTheDocument();
    });

    test("navbar opens profile dialog when profile button is clicked", () => {
        render(<HomePage />);
        
        expect(screen.queryByText("Account")).not.toBeInTheDocument();
        fireEvent.click(screen.getByText("Profile"));
        jest.advanceTimersByTime(0);
        expect(screen.getByText("Account")).toBeInTheDocument();
    });

    test("navbar closes profile dialog when close button is clicked", () => {
        render(<HomePage />);
        
        fireEvent.click(screen.getByText("Profile"));
        expect(screen.getByText("Account")).toBeInTheDocument();
        
        fireEvent.click(screen.getByLabelText("close"));
        jest.advanceTimersByTime(0);
        expect(screen.queryByText("Account")).not.toBeInTheDocument();
    });

    test("redirects to login page when logout button is clicked", () => {
        const pushMock = jest.fn();
        useRouter.mockReturnValue({ push: pushMock });
        
        render(<HomePage />);
        
        fireEvent.click(screen.getByRole("link"));
        expect(pushMock).toHaveBeenCalledWith("/login");
    });
});
