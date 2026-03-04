import React from "react";
import { AppBar, Avatar, Box, Container, IconButton, Toolbar, Typography, Menu, MenuItem } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../state/AuthContext";
import { useNavigate } from "react-router-dom";

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

  const initials = (user?.name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(16,24,40,0.06)" }}>
        <Toolbar>
          <Typography
            variant="h6"
            onClick={() => nav("/")}
            sx={{
              fontWeight: 800,
              letterSpacing: -0.4,
              cursor: "pointer",
              userSelect: "none",
              "&:hover": { opacity: 0.85 },
            }}
          >
            {title}
          </Typography>

          <Box sx={{ flex: 1 }} />

          <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Menu do usuário">
            <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main" }}>{initials}</Avatar>
          </IconButton>

          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem disabled>
              <Box>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); nav("/"); }}>
              Início
            </MenuItem>
            <MenuItem onClick={async () => { setAnchor(null); await logout(); nav("/login"); }}>
              <LogoutRoundedIcon fontSize="small" style={{ marginRight: 8 }} /> Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}