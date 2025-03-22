const { render, screen } = require('@testing-library/react');
const HomePage = require('../HomePage');

describe('HomePage', () => {
	let container;

	beforeEach(() => {
		container = render(<HomePage />).container;
	});

	afterEach(() => {
		container = null;
	});

	test('renders welcome message', () => {
		const welcomeMessage = screen.getByText(/welcome/i);
		expect(welcomeMessage).toBeInTheDocument();
	});

	test('renders navigation links', () => {
		const navLinks = screen.getAllByRole('link');
		expect(navLinks.length).toBeGreaterThan(0);
	});

	test('renders footer', () => {
		const footer = screen.getByRole('contentinfo');
		expect(footer).toBeInTheDocument();
	});
});