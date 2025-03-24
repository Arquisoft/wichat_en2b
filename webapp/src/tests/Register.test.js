import React, { act } from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Register from "../components/register/AddUser";
import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

describe("InGameChat Component", () => {
    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test("renders the Register component correctly", () => {
            render(<Register />);
            
            expect(screen.getByText("Create an account")).toBeInTheDocument();
            expect(screen.getByText("Enter your details below to create your account")).toBeInTheDocument();
            expect(screen.getByText("Username *")).toBeInTheDocument();
            expect(screen.getByText("Stats")).toBeInTheDocument();
            expect(screen.getByText("Leaderboard")).toBeInTheDocument();
        });
});
