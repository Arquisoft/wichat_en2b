"use client"

import { useState, useEffect } from "react"
import "../../styles/home/IntroHomePage.css"
import { useRouter } from "next/navigation"

import {
  PlayArrow as PlayIcon,
  Chat as ChatIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  ArrowDownward as ScrollIcon
} from "@mui/icons-material"

import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Fade,
  Zoom,
} from "@mui/material"


function IntroHomePage() {
  const router = useRouter()
  const [setScrolled] = useState(false)
  const [animateFeatures, setAnimateFeatures] = useState(false)
  const [currentYear, setCurrentYear] = useState(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear()); // For footer       

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setScrolled(true)
      }

      if (window.scrollY > 300) {
        setAnimateFeatures(true)
      }
    }

    window.addEventListener("scroll", handleScroll)

    // Trigger animation after a delay for initial load
    const timer = setTimeout(() => {
      setAnimateFeatures(true)
    }, 1000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  const handlePlayNow = () => {
    router.push("/guest/home")
  }

  const handleLogin = () => {
    router.push("/login")
  }

  const handleRegister = () => {
    router.push("/addUser")
  }

  const scrollToFeatures = () => {
    document.getElementById("features").scrollIntoView({ behavior: "smooth" })
  }

  return (
    <Box className="intro-home-container">
      {/* Hero Section with Background */}
      <Box className="hero-background">
        <Container maxWidth="lg" className="hero-content">
          <Fade in={true} timeout={1000}>
            <Box className="hero-text-container">
              <Typography variant="h1" component="h1" className="hero-title">
                Welcome to <span className="highlight">WiChat</span>
              </Typography>

              <Typography variant="h5" className="hero-subtitle">
                Connect, Learn, and Play with engaging quizzes!
              </Typography>

              <Box className="hero-buttons">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<PlayIcon />}
                  className="play-now-button"
                  onClick={handlePlayNow}
                  data-testid="play-now-button"
                >
                  Play Now
                </Button>

                <Box className="auth-buttons">
                  <Button
                    variant="contained"
                    className="login-button auth-button"
                    size="large"
                    onClick={handleLogin}
                    data-testid="cta-login-button"
                  >
                    Login
                  </Button>

                  <Button
                    variant="contained"
                    className="register-button auth-button"
                    size="large"
                    onClick={handleRegister}
                    data-testid="cta-register-button"
                  >
                    Register
                  </Button>
                </Box>
              </Box>

              <Button className="scroll-button" onClick={scrollToFeatures} endIcon={<ScrollIcon />}>
                Discover More
              </Button>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" className="features-section">
        <Container maxWidth="lg">
          <Typography variant="h2" className="section-title">
            Why Choose WiChat?
          </Typography>

          <Grid container spacing={4} className="features-grid">
            <Grid item xs={12} sm={4} md={4}>
              <Zoom in={animateFeatures} style={{ transitionDelay: animateFeatures ? "200ms" : "0ms" }}>
                <Paper elevation={3} className="feature-card">
                  <ChatIcon className="feature-icon" style={{ fontSize: 50 }} />
                  <Typography variant="h5" className="feature-title">
                    Interactive Chats
                  </Typography>
                  <Typography className="feature-description">Connect with friends in real-time chat rooms.</Typography>
                </Paper>
              </Zoom>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Zoom in={animateFeatures} style={{ transitionDelay: animateFeatures ? "400ms" : "0ms" }}>
                <Paper elevation={3} className="feature-card">
                  <SchoolIcon className="feature-icon" style={{ fontSize: 50 }} />
                  <Typography variant="h5" className="feature-title">
                    Learn & Play
                  </Typography>
                  <Typography className="feature-description">Fun and educational quizzes for everyone.</Typography>
                </Paper>
              </Zoom>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Zoom in={animateFeatures} style={{ transitionDelay: animateFeatures ? "600ms" : "0ms" }}>
                <Paper elevation={3} className="feature-card">
                  <TrophyIcon className="feature-icon" style={{ fontSize: 50 }} />
                  <Typography variant="h5" className="feature-title">
                    Compete & Win
                  </Typography>
                  <Typography className="feature-description">Challenge others and win rewards.</Typography>
                </Paper>
              </Zoom>
            </Grid>
          </Grid>
        </Container>
      </Box>


      {/* Call-to-Action Section */}
      <Box className="bottom-cta-section">
        <Container maxWidth="md">
          <Paper elevation={6} className="cta-paper">
            <Typography variant="h4" className="cta-title">
              Ready to Start Your Journey?
            </Typography>

            <Typography variant="body1" className="cta-description">
              Join thousands of players already enjoying WiChat's interactive quizzes and community.
            </Typography>

            <Box className="cta-buttons">
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayIcon />}
                onClick={handlePlayNow}
                className="cta-main-button"
              >
                Play Now
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                size="large"
                onClick={handleRegister}
                className="cta-secondary-button"
              >
                Create Account
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <div className="footer-container">
          <footer className={`footer ${currentYear ? "" : "footer-dark"}`}>
              <div className="footer__content">
                  <div className="footer__brand">WiChat</div>
                  <div className="footer__text">
                      {currentYear ? `© ${currentYear} WiChat. All rights reserved.` : "Loading..."}
                  </div>
              </div>
          </footer>
      </div>
    </Box>
  )
}

export default IntroHomePage
