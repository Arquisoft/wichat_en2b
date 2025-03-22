import React from "react";
import PropTypes from "prop-types";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePage from "../components/home/HomeViewPage";

// Mock de los componentes hijos para evitar dependencias externas en las pruebas
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
    test("renders the HomePage component correctly", () => {
        render(<HomePage />);
        
        // Verify that the Navbar and StatisticsCard components are rendered
        expect(screen.getByTestId("navbar")).toBeInTheDocument();

        // Verify that the title WiChat appears
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();

        // Verify that the description appears
        expect(screen.getByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();

        // Verify that the StatisticsCard is rendered
        expect(screen.getByTestId("statistics-card")).toBeInTheDocument();

        // Verify that the Play tab is active at the start
        expect(screen.getByTestId("play-tab")).toBeInTheDocument();
    });

    test("changes tabs when clicked", () => {
        render(<HomePage />);

        // Verify that the initial tab is "Play"
        expect(screen.getByTestId("play-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();

        // Change to the "Stats" tab
        fireEvent.click(screen.getByText("Stats"));
        expect(screen.getByTestId("stats-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("play-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();

        // Change to the "Leaderboard" tab
        fireEvent.click(screen.getByText("Leaderboard"));
        expect(screen.getByTestId("leaderboard-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("play-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
    });

    test("renders the footer with the current year", () => {
        render(<HomePage />);
        
        // Verify that the footer is rendered
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(`© ${currentYear} WiChat. All rights reserved.`)).toBeInTheDocument();
    });

    test("does not render the HomePage components if data is missing", () => {
        // Mock the setTimeout function to execute the callback immediately
        jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb()); 
        
        render(<HomePage />);
    
        // Verify that the Navbar and StatisticsCard components are rendered
        expect(screen.queryByTestId("navbar")).toBeInTheDocument();
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();
        expect(screen.queryByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();
        expect(screen.queryByTestId("statistics-card")).toBeInTheDocument();
    
        // Verify that no other tabs are visible in an erroneous state
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();
    });

    test("navbar renders correctly", () => {
        jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb()); 
        
        render(<HomePage />);

        expect(screen.getByText("WiChat")).toBeInTheDocument();
        expect(screen.getByText("Profile")).toBeInTheDocument();
        expect(screen.getByRole("link")).toBeInTheDocument(); // Logout link
    });

    test("navbar opens profile dialog when profile button is clicked", () => {
        jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb()); 
        
        render(<HomePage />);

        // Profile dialog should be closed initially
        expect(screen.getByText("Account")).not.toBeInTheDocument();

        // Click profile button
        fireEvent.click(screen.getByText("Profile"));

        // Dialog should be open
        expect(screen.getByText("Account")).toBeInTheDocument();
    });

    test("navbar closes profile dialog when close button is clicked", () => {
        jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb()); 
        
        render(<HomePage />);

        // Open dialog
        fireEvent.click(screen.getByText("Profile"));
        expect(screen.getByText("Account")).toBeInTheDocument();

        // Close dialog
        fireEvent.click(screen.getByLabelText("close"));

        // Profile dialog should be closed
        expect(screen.queryByText("Account")).not.toBeInTheDocument();
    });

    test("redirects to login page when logout button is clicked", () => {
        const pushMock = jest.fn();
        useRouter.mockReturnValue({ push: pushMock });

        render(<HomePage />);

        // Click logout button
        const logoutLink = screen.getByRole("link");
        fireEvent.click(logoutLink);
        
        // Verify that the push function was called with the correct path
        expect(pushMock).toHaveBeenCalledWith("/login");
    });
});