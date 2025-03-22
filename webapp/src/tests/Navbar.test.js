import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "../components/home/ui/Navbar";
import { useRouter } from "next/router";

// Mock next/router
jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

describe("Navbar Component", () => {
  test("renders correctly with username", () => {
    render(<Navbar username="TestUser" />);

    expect(screen.getByText("WiChat")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByRole("link")).toBeInTheDocument(); // Logout link
  });

  test("opens profile dialog when profile button is clicked", () => {
    render(<Navbar username="TestUser" />);

    // Dialog should be closed initially
    expect(screen.getByText("Cuenta")).not.toBeInTheDocument();

    // Click profile button
    fireEvent.click(screen.getByText("Profile"));

    // Dialog should be open
    expect(screen.getByText("Cuenta")).toBeInTheDocument();
  });

  test("closes profile dialog when close button is clicked", () => {
    render(<Navbar username="TestUser" />);

    // Open dialog
    fireEvent.click(screen.getByText("Profile"));
    expect(screen.getByText("Cuenta")).toBeInTheDocument();

    // Close dialog
    fireEvent.click(screen.getByLabelText("close"));

    // Dialog should be closed
    expect(screen.queryByText("Cuenta")).not.toBeInTheDocument();
  });

  test("redirects to login page when logout button is clicked", () => {
    const pushMock = jest.fn();
    useRouter.mockReturnValue({ push: pushMock });

    render(<Navbar username="TestUser" />);

    // Click logout button
    const logoutLink = screen.getByRole("link");
    expect(logoutLink.getAttribute("href")).toBe("/login");
  });
});
