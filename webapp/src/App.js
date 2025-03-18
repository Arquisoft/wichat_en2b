import React, { useState } from 'react';

import AddUser from './components/AddUser';
import Login from './components/Login';
import QuestionGame from './components/game/QuestionGame';

import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

function App() {
  const [currentView, setCurrentView] = useState('questionGame');

  const handleToggleView = (view) => {
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <Login />;
      case 'adduser':
        return <AddUser />;
      case 'questionGame':
        return <QuestionGame />;
      default:
        return <Login />;
    }
  };

  return (
    <React.Fragment>
      <CssBaseline />
      
      {currentView === 'questionGame' ? (
        <QuestionGame />
      ) : (
        
        <Container component="main" maxWidth="xs">
          <Typography component="h1" variant="h5" align="center" sx={{ marginTop: 2 }}>
            Welcome to the 2025 edition of the Software Architecture course!
          </Typography>
          
          {renderView()}
          
          <Typography component="div" align="center" sx={{ marginTop: 2 }}>
            {currentView === 'login' ? (
              <div>
                <Link 
                  name="gotoregister" 
                  component="button" 
                  variant="body2" 
                  onClick={() => handleToggleView('register')}
                >
                  Don't have an account? Register here.
                </Link>
                <br />
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => handleToggleView('quiz')}
                  sx={{ marginTop: 1 }}
                >
                  Go to Quiz
                </Link>
              </div>
            ) : (
              <div>
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => handleToggleView('login')}
                >
                  Already have an account? Login here.
                </Link>
                <br />
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => handleToggleView('quiz')}
                  sx={{ marginTop: 1 }}
                >
                  Go to Quiz
                </Link>
              </div>
            )}
          </Typography>
        </Container>
      )}
    </React.Fragment>
  );
}

export default App;