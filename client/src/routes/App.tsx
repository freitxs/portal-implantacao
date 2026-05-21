import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { ToastProvider } from "../components/ToastProvider";
import { AuthProvider, useAuth } from "../state/AuthContext";
import { FilesPage } from "./client/FilesPage";
import { SchedulePage } from "./client/SchedulePage";
import { TimelinePage } from "./client/TimelinePage";
import { FormSummaryPage } from "./FormSummaryPage";
import { HelpPage } from "./HelpPage";
import { LoginPage } from "./LoginPage";
import { MyFormsPage } from "./MyFormsPage";
import { StageThreePage } from "./StageThreePage";
import { StageTwoPage } from "./StageTwoPage";
import { WizardPage } from "./Wizard/WizardPage";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminFormDetailPage } from "./admin/AdminFormDetailPage";
import { AdminFormsPage } from "./admin/AdminFormsPage";
import { AdminUsersPage } from "./admin/AdminUsersPage";

function IndexRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "ADMIN" ? <Navigate to="/admin" replace /> : <Navigate to="/inicio" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<IndexRedirect />} />

          <Route
            path="/inicio"
            element={
              <ProtectedRoute role="CLIENT">
                <MyFormsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/meus-formularios"
            element={
              <ProtectedRoute role="CLIENT">
                <Navigate to="/inicio" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wizard/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <WizardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cronograma/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <TimelinePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/arquivos/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <FilesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/agendamento/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <SchedulePage />
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
            path="/etapa-02/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <StageTwoPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/etapa-03/:formId"
            element={
              <ProtectedRoute role="CLIENT">
                <StageThreePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ajuda"
            element={
              <ProtectedRoute>
                <HelpPage />
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
