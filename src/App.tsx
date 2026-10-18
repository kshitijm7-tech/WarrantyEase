/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WarrantyProvider } from './context/WarrantyContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OverviewPage } from './pages/OverviewPage';
import { WarrantiesPage } from './pages/WarrantiesPage';
import { WarrantyDetailPage } from './pages/WarrantyDetailPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { WarrantyAssistantPage } from './pages/WarrantyAssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <WarrantyProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Authentication & Demo Access */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/signin" element={<Navigate to="/auth" replace />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />

          {/* App Dashboard Routes */}
          <Route element={<AppLayout />}>
            <Route path="overview" element={<OverviewPage />} />
            <Route path="warranties" element={<WarrantiesPage />} />
            <Route path="warranties/:id" element={<WarrantyDetailPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="assistant" element={<WarrantyAssistantPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Support /app prefix */}
            <Route path="app" element={<Navigate to="/overview" replace />} />
            <Route path="app/overview" element={<OverviewPage />} />
            <Route path="app/warranties" element={<WarrantiesPage />} />
            <Route path="app/warranties/:id" element={<WarrantyDetailPage />} />
            <Route path="app/documents" element={<DocumentsPage />} />
            <Route path="app/assistant" element={<WarrantyAssistantPage />} />
            <Route path="app/notifications" element={<NotificationsPage />} />
            <Route path="app/settings" element={<SettingsPage />} />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WarrantyProvider>
  );
}
