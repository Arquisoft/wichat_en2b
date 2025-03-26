import React, { act } from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Register from "../components/register/AddUser";
import fetchMock from "jest-fetch-mock";
import { useStepperContext } from "@mui/material";

jest.mock("next/navigation", () => ({
    useRouter: () => ({
      push: jest.fn()
    }),
  }));
  

fetchMock.enableMocks();

describe("Register Component", () => {
    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test("Renders the Register component correctly", () => {
        render(<Register />);
        
        expect(screen.getByText("Create an account")).toBeInTheDocument();
        expect(screen.getByText("Enter your details below to create your account")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Username *")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password *")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm Password *")).toBeInTheDocument();
        expect(screen.getByText("Already have an account? Login here")).toBeInTheDocument();
        expect(screen.getByText("Register")).toBeInTheDocument();
    });

    test("Given valid input, the user can register", async () => {
        render(<Register />);

        const UserTest = {
            username: "testUser",
            password: "testPassword",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Username *");
        const passwordInput = screen.getByPlaceholderText("Password *");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm Password *");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        expect(usernameInput).toHaveValue(UserTest.username);

        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        expect(passwordInput).toHaveValue(UserTest.password);

        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });
        expect(confirmPasswordInput).toHaveValue(UserTest.confirmPassword);

        //Click the register button
        fireEvent.click(registerButtonInput);

        //Expect the login page to be rendered
        expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });

    test("Given invalid input, the user can register", async () => {
        render(<Register />);

        const UserTest = {
            username: "testUser",
            password: "testPassword",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Username *");
        const passwordInput = screen.getByPlaceholderText("Password *");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm Password *");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        expect(usernameInput).toHaveValue(UserTest.username);

        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        expect(passwordInput).toHaveValue(UserTest.password);

        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });
        expect(confirmPasswordInput).toHaveValue(UserTest.confirmPassword);

        //Click the register button
        fireEvent.click(registerButtonInput);

        //Expect the login page to be rendered
        expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });
});
