import React, { useEffect, useState } from "react";
import { Card, Grid, CardHeader, CardContent, Typography, Button } from "@mui/material";
import Link from "next/link";
import "../../../styles/home/PlayTab.css";

function PlayTab() {
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await fetch("http://localhost:8000/quiz/AllTopics");
				const data = await response.json();

				// Convert to objects with dummy values if needed
				const formattedCategories = data.map((cat, idx) => ({
					id: idx, // or cat if it's a unique string
					name: cat,
					color: "#2196f3", // default or fetched if available
					icon: "📚", // placeholder
					quizCount: 5, // placeholder unless you fetch that too
				}));

				setCategories(formattedCategories);
			} catch (error) {
				console.error("Failed to fetch categories:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	return (
		<Grid container spacing={3} className="categories-container">
			{loading ? (
				<Typography>Loading categories...</Typography>
			) : (
				categories.map((category) => (
					<Grid key={category.id} item xs={12} sm={6} md={4}>
						<Card className="category-card">
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
							<CardContent className="category-content">
								<Typography className="quiz-count">
									{category.quizCount} quizzes available
								</Typography>
								<Link href={`/quiz/category/${category.name}`} passHref>
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
				))
			)}
		</Grid>
	);
}

export default PlayTab;
