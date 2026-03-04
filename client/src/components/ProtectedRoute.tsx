import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { CircularProgress, Box } from "@mui/material";
import type { Role } from "../types";

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", height: "70vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
}
