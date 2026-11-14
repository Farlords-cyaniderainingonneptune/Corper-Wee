import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { EventsPage } from './pages/EventsPage';
import { LocationsPage } from './pages/LocationsPage';
import { PlatoonsPage } from './pages/PlatoonsPage';
import { MarketPage } from './pages/MarketPage';
import { EconomyPage } from './pages/EconomyPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/platoons" element={<PlatoonsPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/economy" element={<EconomyPage />} />
            <Route path="/config" element={<EconomyPage />} />
            <Route
              path="/staff"
              element={
                <ProtectedRoute requireSuperadmin={true}>
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
