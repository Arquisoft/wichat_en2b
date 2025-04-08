import React from "react";
import { Card, Grid, CardHeader, CardContent, Typography, Button } from "@mui/material";
import { quizCategories } from "../data";
import Link from "next/link";
import "../../../styles/home/PlayTab.css";

/**
 * Displays quiz categories for the user to select.
 * 
 * @param {boolean} isGuest - Whether the user is a guest.
 * 
 * @returns {JSX.Element} The rendered component.
 */
function PlayTab({ isGuest }) {
  	return (
		<Grid container spacing={3} className="categories-container">
			{quizCategories.map((category) => (
				<Grid key={category.id} size={{ xs: 12, sm: 6, md: 4 }}>
					<Card className="category-card">
						{/* Category header */}
						<CardHeader
							title={
								<>
									<span className="category-icon">{category.icon}</span>
									{category.name}
								</>
							}
							className="category-header"
							sx={{ bgcolor: category.color }}
						/>

						{/* Category content */}
						<CardContent className="category-content">
							<Typography className="quiz-count">
								{category.quizCount} quizzes available
							</Typography>
							
							{/* Enter category button */}
							<Link 
								href={isGuest 
									? `/guest/quiz/category/${category.id}` // Guest route
									: `/quiz/category/${category.id}`} // Authenticated route
								passHref
							>
								<Button
									variant="text"
									fullWidth
									className={`start-button button-${category.name.toLowerCase()}`}
								>
									Enter Category
								</Button>
							</Link>
						</CardContent>
					</Card>
				</Grid>
			))}
		</Grid>
  	);
}

export default PlayTab;
