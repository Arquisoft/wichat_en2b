import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import IntroHomePage from "../components/home/IntroHomePage";
import mockRouter from "next-router-mock";

jest.mock("next/navigation", () => require("next-router-mock"));

// Mock window.location.href
const mockLocation = jest.fn();
delete window.location;
window.location = { href: "" };
Object.defineProperty(window.location, "href", {
    set: mockLocation,
    get: () => "",
});

describe("IntroHomePage Component", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockRouter.setCurrentUrl("/");
    });

    afterEach(() => {
        act(() => jest.runOnlyPendingTimers());
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    test("renders the IntroHomePage component correctly", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        await waitFor(() => {
            expect(screen.getByText("Welcome to")).toBeInTheDocument();
            expect(screen.getByText("Connect, Learn, and Play with engaging quizzes!")).toBeInTheDocument();
            expect(screen.getByTestId("play-now-button")).toBeInTheDocument();
            expect(screen.getByTestId("cta-login-button")).toBeInTheDocument();
            expect(screen.getByTestId("cta-register-button")).toBeInTheDocument();
        });
    });

    test("navbar renders correctly", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        await waitFor(() => {
            expect(screen.getByTestId("cta-login-button")).toBeInTheDocument();
            expect(screen.queryByText("Profile")).not.toBeInTheDocument();
        });
    });

    test("redirects to guest home when Play as Guest is clicked", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        act(() => {
            fireEvent.click(screen.getByTestId("play-now-button"));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe('/guest/home');
        });
    });

    test("redirects to login page when Login button is clicked", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        act(() => {
            fireEvent.click(screen.getByTestId("cta-login-button"));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe('/login');
        });
    });

    test("redirects to register page when Register button is clicked", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        act(() => {
            fireEvent.click(screen.getByTestId("cta-register-button"));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe('/addUser');
        });
    });

    test("redirects to login page when Login button is clicked in call-to-action", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        act(() => {
            fireEvent.click(screen.getByTestId("cta-login-button"));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe('/login');
        });
    });

    test("redirects to register page when Register button is clicked in call-to-action", async () => {
        await act(async () => {
            render(<IntroHomePage />);
        });

        act(() => {
            fireEvent.click(screen.getByTestId("cta-register-button"));
        });

        await waitFor(() => {
            expect(mockRouter.asPath).toBe('/addUser');
        });
    });
});