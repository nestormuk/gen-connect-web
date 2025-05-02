import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import StoryEditorPage from './pages/StoryEditorPage';
import StoryDetailsPage from './pages/StoryDetailsPage';
import StoriesPage from './pages/StoriesPage';
import FamilyPage from './pages/FamilyPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import JoinFamilyPage from './pages/JoinFamilyPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<HomePage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="stories/new" element={<StoryEditorPage />} />
        <Route path="/stories/:storyId" element={<StoryDetailsPage />} />
        <Route path="stories/:id/edit" element={<StoryEditorPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="/join-family" element={<JoinFamilyPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;