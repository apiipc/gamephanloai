import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import AdminPage from './pages/AdminPage';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MissionsPage from './pages/MissionsPage';
import PlayPage from './pages/PlayPage';
import ProfilePage from './pages/ProfilePage';
import ResultPage from './pages/ResultPage';
import QuizPage from './pages/QuizPage';
import QuizResultPage from './pages/QuizResultPage';
import QuizWelcomePage from './pages/QuizWelcomePage';
import WheelWelcomePage from './pages/WheelWelcomePage';
import WheelPage from './pages/WheelPage';
import WheelHistoryPage from './pages/WheelHistoryPage';

export default function App() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Đang tải...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/play"
        element={
          <ProtectedRoute>
            <PlayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/result"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <ResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <QuizWelcomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/play"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/result"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <QuizResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wheel"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <WheelWelcomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wheel/play"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <WheelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wheel/history"
        element={
          <ProtectedRoute roles={['STUDENT']}>
            <WheelHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <ProtectedRoute>
            <MissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ORG_ADMIN', 'TEACHER']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? (isAdmin ? '/' : '/') : '/login'} replace />} />
    </Routes>
  );
}
