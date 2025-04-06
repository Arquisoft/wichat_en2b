import React, { act } from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Register from "../components/register/AddUser";
import axios from "axios";

jest.mock("axios");

// Mock de useRouter para capturar redirecciones
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({
      push: mockPush,
    }),
}));


describe("Register Component", () => {
   
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    test("Renders the Register component correctly", () => {
        render(<Register />);
        
        expect(screen.getByText("Create an Account")).toBeInTheDocument();
        expect(screen.getByText("Enter your username and password below to sign up!")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter your username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm your password")).toBeInTheDocument();
        expect(screen.getByText("Login here")).toBeInTheDocument();
        expect(screen.getByText("Register")).toBeInTheDocument();
    });

    test("Given valid input, the user can register", async () => {
        const mockPush = jest.fn();
        jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: mockPush });
        
        fetch.mockResponseOnce(JSON.stringify({ token: 'fake-token' }), { status: 200 });

        render(<Register />);

        const UserTest = {
            username: "testUser",
            password: "testPassword",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        expect(usernameInput).toHaveValue(UserTest.username);

        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        expect(passwordInput).toHaveValue(UserTest.password);

        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });
        expect(confirmPasswordInput).toHaveValue(UserTest.confirmPassword);

        //Click the register button
        //Expect the home page to be rendered
        await act(async () => {
            fireEvent.click(registerButtonInput);
            jest.advanceTimersByTime(1000);
        });
        
        await waitFor(() => {
            expect(document.cookie).toContain('token=fake-token');
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    test("Given an empty username, the error is shown", async () => {
        render(<Register />);

        const UserTest = {
            username: "    ",
            password: "testPassword",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        
        await waitFor(() => {
            expect(screen.getByText("Username is required")).toBeInTheDocument();
        }, { timeout: 2000 });
        
    });

    test("Given a username with blanks, the error is shown", async () => {
        render(<Register />);

        const UserTest = {
            username: "ca ca",
            password: "testPassword",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        
        await waitFor(() => {
            expect(screen.getByText("Username cannot contain white spaces")).toBeInTheDocument();
        }, { timeout: 2000 });
        
    });

    test("Given a short username with blanks, the error is shown", async () => {
        render(<Register />);

        const UserTest = {
            username: "    c    ",
            password: "testPassword",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        
        await waitFor(() => {
            expect(screen.getByText("Username must be at least 3 characters")).toBeInTheDocument();
        }, { timeout: 2000 });
        
    });

    test("Given a blank password, the user is not registered", async () => {
        render(<Register />);

        const UserTest = {
            username: "testUser",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        expect(screen.getByText("Create an Account")).toBeInTheDocument();
        expect(screen.getByText("Enter your username and password below to sign up!")).toBeInTheDocument();
    });

    test("Given a short password, the error is shown", async () => {
        render(<Register />);

        const UserTest = {
            username: "testUser",
            password: "a",
            confirmPassword: "testPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        
        await waitFor(() => {
            expect(screen.getByText("The password must be at least 6 characters")).toBeInTheDocument();
        }, { timeout: 2000 });
        
    });

    test("Given an empty confirmation password, the user is not registered", async () => {
        render(<Register />);

        const UserTest = {
            username: "testUser",
            password: "testPassword",
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        
        expect(screen.getByText("Create an Account")).toBeInTheDocument();
        expect(screen.getByText("Enter your username and password below to sign up!")).toBeInTheDocument();
        
    });

    test("Given different passwords, the error is shown", async () => {
        render(<Register />);

        const UserTest = {
            username: "testUser",
            password: "testPassword",
            confirmPassword: "differentPassword"
        };

        //Get the elements
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButtonInput = screen.getByText("Register");

        //Fill in the form
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });

        //Click the register button
        fireEvent.click(registerButtonInput);

        
        await waitFor(() => {
            expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
        }, { timeout: 2000 });
    });

    test("Given repeated username, the error is shown", async () => {
        jest.spyOn(axios, "post").mockRejectedValueOnce({
            response: {
                status: 400,
                data: { error: "Username already exists" },
            },
        });
        

        render(<Register />);
    
        const UserTest = {
            username: "testUser",
            password: "testPassword",
            confirmPassword: "testPassword"
        };
    
        // Obtener los elementos
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButton = screen.getByText("Register");
    
        // Llenar el formulario
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });
    
        // Simular el click en el botón de registro
        await act(async () => {
            fireEvent.click(registerButton);
        });
    
        
        await waitFor(() => {
            expect(screen.getByText("Username already exists")).toBeInTheDocument();
        });
    });
    
    test("Given an unexpected error, the error is shown", async () => {
        jest.spyOn(axios, "post").mockRejectedValueOnce({
            response: {
                status: 500,
                data: { error: "Internal server error" },
            },
        });
        

        render(<Register />);
    
        const UserTest = {
            username: "newUser",
            password: "testPassword",
            confirmPassword: "testPassword"
        };
    
        // Obtener los elementos
        const usernameInput = screen.getByPlaceholderText("Enter your username");
        const passwordInput = screen.getByPlaceholderText("Enter your password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm your password");
        const registerButton = screen.getByText("Register");
    
        // Llenar el formulario
        fireEvent.change(usernameInput, { target: { value: UserTest.username } });
        fireEvent.change(passwordInput, { target: { value: UserTest.password } });
        fireEvent.change(confirmPasswordInput, { target: { value: UserTest.confirmPassword } });
    
        // Simular el click en el botón de registro
        await act(async () => {
            fireEvent.click(registerButton);
        });
    
        
        await waitFor(() => {
            expect(screen.getByText("An error has occurred. Please try again later.")).toBeInTheDocument();
        });
    });
});
