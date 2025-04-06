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
				const response = await fetch("http://localhost:8000/quiz");
				const data = await response.json();

				const formattedCategories = Object.values(
					data.reduce((acc, quiz) => {
						const category = quiz.category;
						if (!acc[category]) {
							acc[category] = {
								id: category,
								name: category,
								color: quiz.color,
								icon: "📚",
								quizCount: 1,
							};
						} else {
							acc[category].quizCount += 1;
						}
						return acc;
					}, {})
				);

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
					<Grid key={category.id} size={{xs:12, sm:6, md:4}} >
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
									{category.quizCount} questions available
								</Typography>
								<Link href={`/quiz/category/${category.name}`} passHref>
									<Button
										variant="text"
										fullWidth
										className={`start-button button-${category.name?.toLowerCase?.() || "default"}`}
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
