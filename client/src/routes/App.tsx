import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../state/AuthContext";
import { ToastProvider } from "../components/ToastProvider";
import { LoginPage } from "./LoginPage";
import { WizardPage } from "./Wizard/WizardPage";
import { MyFormsPage } from "./MyFormsPage";
import { FormSummaryPage } from "./FormSummaryPage";
import { AdminFormsPage } from "./admin/AdminFormsPage";
import { AdminFormDetailPage } from "./admin/AdminFormDetailPage";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminUsersPage } from "./admin/AdminUsersPage";
import { ProtectedRoute } from "../components/ProtectedRoute";

function IndexRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "ADMIN" ? <Navigate to="/admin" replace /> : <Navigate to="/meus-formularios" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<IndexRedirect />} />

          <Route
            path="/wizard/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <WizardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/meus-formularios"
            element={
              <ProtectedRoute role="CLIENT">
                <MyFormsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resumo/:formId"
            element={
              <ProtectedRoute>
                <FormSummaryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/forms"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminFormsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/forms/:formId"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminFormDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Gestão de usuários */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}