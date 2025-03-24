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

    test("Renders the Register component correctly", () => {
        render(<Register />);
        
        expect(screen.getByText("Create an account")).toBeInTheDocument();
        expect(screen.getByText("Enter your details below to create your account")).toBeInTheDocument();
        expect(screen.getByText("Username")).toBeInTheDocument();
        expect(screen.getByText("Password")).toBeInTheDocument();
        expect(screen.getByText("Confirm Password")).toBeInTheDocument();
    });

    test("Given valid input, the user can register", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ success: true }));

        render(<Register />);
        
        const username = screen.getByText("Username");
        const password = screen.getByText("Password");
        const confirmPassword = screen.getByText("Confirm Password");
        const submitButton = screen.getByRole("button", { name: "submit" });

        fireEvent.change(username, { target: { value: "testuser" } });
        fireEvent.change(password, { target: { value: "password" } });
        fireEvent.change(confirmPassword, { target: { value: "password" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith("/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: "testuser",
                    password: "password",
                }),
            });
        });
    });
});
