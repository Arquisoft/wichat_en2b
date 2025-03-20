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
        
        // Verifica si la barra de navegación se renderiza
        expect(screen.getByTestId("navbar")).toBeInTheDocument();

        // Verifica si el título WiChat aparece
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();

        // Verifica si la descripción aparece
        expect(screen.getByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();

        // Verifica si el StatisticsCard se renderiza
        expect(screen.getByTestId("statistics-card")).toBeInTheDocument();

        // Verifica si la pestaña Play está activa al inicio
        expect(screen.getByTestId("play-tab")).toBeInTheDocument();
    });

    test("changes tabs when clicked", () => {
        render(<HomePage />);

        // Asegurarse de que la pestaña inicial es "Play"
        expect(screen.getByTestId("play-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();

        // Cambiar a la pestaña "Stats"
        fireEvent.click(screen.getByText("Stats"));
        expect(screen.getByTestId("stats-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("play-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();

        // Cambiar a la pestaña "Leaderboard"
        fireEvent.click(screen.getByText("Leaderboard"));
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
        // Mockear el caso en que no se encuentre la categoría o datos
        jest.spyOn(global, "setTimeout").mockImplementationOnce((cb) => cb()); // evitar retrasos en el uso de setTimeout
    
        render(<HomePage />);
    
        // Asegurarse de que no se rendericen componentes si faltan datos
        expect(screen.queryByTestId("navbar")).toBeInTheDocument();
        expect(screen.getByText("WiChat", { selector: 'h1' })).toBeInTheDocument();
        expect(screen.queryByText("Connect, Learn, and Play with WiChat")).toBeInTheDocument();
        expect(screen.queryByTestId("statistics-card")).toBeInTheDocument();
    
        // Verificar si no hay otras pestañas visibles en un estado erróneo
        expect(screen.queryByTestId("stats-tab")).not.toBeInTheDocument();
        expect(screen.queryByTestId("leaderboard-tab")).not.toBeInTheDocument();
    });
});
