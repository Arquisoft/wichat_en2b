import React, { useEffect, useState } from "react";
import { Card, Grid, CardHeader, CardContent, Typography, Button } from "@mui/material";
import Link from "next/link";
import "../../../styles/home/PlayTab.css";

const apiEndpoint = process.env.NEXT_PUBLIC_GATEWAY_SERVICE_URL || 'http://localhost:8000';

/**
 * Displays quiz categories for the user to select.
 *
 * @param {boolean} isGuest - Whether the user is a guest.
 * @returns {JSX.Element} The rendered component.
 */
function PlayTab({ isGuest }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/quiz`);
        const data = await response.json();

        const formattedCategories = Object.values(
          data.reduce((acc, quiz) => {
            const category = quiz.category;
            if (!acc[category]) {
              acc[category] = {
                id: category, // Use category as ID (consistent with master)
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
		<Grid key={"custom"} size={{xs:12, sm:6, md:4}} >
				<Card className="category-card">
					<CardHeader
						title={
							<>
								<span className="category-icon">🛠️</span>
								Custom
							</>
						}
						className="category-header custom-category-header"

					/>
					<CardContent className="category-content">
						<Typography className="quiz-count">
							Customize your own quiz, play with friends and much more! 
						</Typography>
						<Link href={`/quiz/custom`} passHref>
							<Button
								variant="text"
								fullWidth
								className={`button-custom`}
							>
								Customize quiz
							</Button>
						</Link>
					</CardContent>
				</Card>
			</Grid>
			
      {loading ? (
        <Typography>Loading categories...</Typography>
      ) : (
        categories.map((category) => (
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
                  href={
                    isGuest
                      ? `/guest/quiz/category/${category.id}` // Guest route
                      : `/quiz/category/${category.id}` // Authenticated route
                  }
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
        ))
      )}
    </Grid>
  );
}

export default PlayTab;