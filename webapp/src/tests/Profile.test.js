import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProfileForm from "../components/home/ui/ProfileForm";

// Mock fetch y document.cookie
global.fetch = jest.fn();
Object.defineProperty(document, "cookie", {
  writable: true,
  value: "token=mock-token",
});

describe("ProfileForm Component", () => {
    const mockOnSave = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        delete window.location;
        window.location = { reload: jest.fn() };
    });

    afterEach(() => {
        jest.restoreAllMocks();     
    });

    test("Changes username correctly", async () => {
        fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "new-mock-token" }),
        });
        
        await act(async () => {
        render(<ProfileForm username="testUser" profilePicture="" onSave={mockOnSave} />);
        });
        
        const usernameField = screen.getByLabelText("Username");
        expect(usernameField.value).toBe("testUser");

        const editBtn = screen.getByRole("button", { name: /Edit Username/i });
        fireEvent.click(editBtn);
        
        fireEvent.change(usernameField, { target: { value: "newUser" } });
        
        // Save Username
        const saveBtn = screen.getByRole("button", { name: /Save Username/i });
        await act(async () => {
        fireEvent.click(saveBtn);
        });

        await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ username: "newUser" }));
        });
        
        expect(window.location.reload).toHaveBeenCalled();
    });

    test("Changes password correctly", async () => {
        fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        });

        await act(async () => {
        render(<ProfileForm username="testUser" profilePicture="" onSave={mockOnSave} />);
        });

        const editPasswordBtn = screen.getByRole("button", { name: /Edit Password/i });
        fireEvent.click(editPasswordBtn);

        const currentPwdField = screen.getByLabelText("Actual password");
        const newPwdField = screen.getByLabelText("New password");
        const confirmPwdField = screen.getByLabelText("Confirm new password");

        fireEvent.change(currentPwdField, { target: { value: "oldPass" } });
        fireEvent.change(newPwdField, { target: { value: "newPass123" } });
        fireEvent.change(confirmPwdField, { target: { value: "newPass123" } });

        // Save Password
        const savePasswordBtn = screen.getByRole("button", { name: /Save Password/i });
        await act(async () => {
        fireEvent.click(savePasswordBtn);
        });

        await waitFor(() => {
        expect(screen.getByText(/Password updated successfully./i)).toBeInTheDocument();
        });

        expect(mockOnSave).toHaveBeenCalled();
    });

    test("Uploads profile picture correctly", async () => {
        fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profilePicture: "http://example.com/newprofile.png" }),
        });

        const file = new File(["dummy content"], "test.png", { type: "image/png" });

        const fileReaderMock = {
        readAsDataURL: jest.fn(),
        result: "data:image/png;base64,dummybase64",
        onloadend: null,
        };

        global.FileReader = jest.fn(() => fileReaderMock);

        await act(async () => {
        render(<ProfileForm username="testUser" profilePicture="" onSave={mockOnSave} />);
        });

        const fileInput = screen.getByLabelText(/Change profile picture/i).parentElement.querySelector("input[type='file']");
        expect(fileInput).toBeInTheDocument();

        await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
        });

        act(() => {
        if (typeof fileReaderMock.onloadend === "function") {
            fileReaderMock.onloadend();
        }
        });

        await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
        });
    });
});
