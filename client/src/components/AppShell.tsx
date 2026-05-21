import React from "react";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { OnboardingForm } from "../types";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
  formId?: string;
};

type NavItem = {
  key: string;
  label: string;
  to?: string;
  enabled: boolean;
  helper?: string;
};

type FormListItem = {
  id: string;
  status: "RASCUNHO" | "ENVIADO";
  currentStep: number;
  createdAt: string;
  updatedAt: string;
};

function buildClientNavItems(currentForm: OnboardingForm | null, currentFormId?: string): NavItem[] {
  const reviewConfirmed = Boolean(currentForm?.stepData?.review?.confirmedAt);
  const hasForm = Boolean(currentFormId);
  const hasUploads = Boolean(currentForm?.uploads?.length || (currentForm?.currentStep ?? 0) >= 3);

  return [
    { key: "inicio", label: "Início", to: "/inicio", enabled: true },
    {
      key: "cronograma",
      label: "Cronograma",
      to: currentFormId ? `/cronograma/${currentFormId}` : undefined,
      enabled: hasForm,
      helper: "Disponível após conclusão da etapa atual",
    },
    {
      key: "arquivos",
      label: "Arquivos",
      to: currentFormId ? `/arquivos/${currentFormId}` : undefined,
      enabled: Boolean(currentFormId && hasUploads),
      helper: hasUploads ? "Área disponível" : "Disponível após revisão",
    },
    {
      key: "agendamento",
      label: "Agendamento",
      to: currentFormId ? `/agendamento/${currentFormId}` : undefined,
      enabled: Boolean(currentFormId && reviewConfirmed),
      helper: reviewConfirmed ? "Área disponível" : "Disponível após confirmação da revisão",
    },
    {
      key: "resumo",
      label: "Resumo",
      to: currentFormId ? `/resumo/${currentFormId}` : undefined,
      enabled: hasForm,
      helper: "Disponível após conclusão da etapa atual",
    },
    { key: "ajuda", label: "Ajuda", to: "/ajuda", enabled: true },
  ];
}

function buildAdminNavItems(): NavItem[] {
  return [
    { key: "painel", label: "Painel", to: "/admin", enabled: true },
    { key: "formularios", label: "Clientes", to: "/admin/forms", enabled: true },
    { key: "usuarios", label: "Usuários", to: "/admin/users", enabled: true },
    { key: "ajuda", label: "Ajuda", to: "/ajuda", enabled: true },
  ];
}

function isActivePath(pathname: string, item: NavItem) {
  if (!item.to) return false;
  if (item.to === "/inicio" && (pathname === "/inicio" || pathname === "/meus-formularios")) return true;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function statusLabel(currentForm: OnboardingForm | null) {
  if (!currentForm) return "Portal pronto para início";
  if (currentForm.stepData?.stage01Completion?.status === "CONCLUIDA") return "Etapa 01 concluída";
  if (currentForm.stepData?.review?.confirmedAt) return "Revisão confirmada";
  if (currentForm.status === "ENVIADO") return "Enviada pelo cliente";
  return "Etapa 01 em andamento";
}

export function AppShell({ title, children, formId }: AppShellProps) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const formsQuery = useQuery({
    queryKey: ["myForms", "shell"],
    queryFn: async () => (await api.get("/api/forms/my")).data.forms as FormListItem[],
    enabled: user?.role === "CLIENT",
    staleTime: 30_000,
  });

  const currentFormId = formId ?? formsQuery.data?.[0]?.id;
  const currentFormQuery = useQuery({
    queryKey: ["form", currentFormId, "shell"],
    queryFn: async () => (await api.get(`/api/forms/${currentFormId}`)).data.form as OnboardingForm,
    enabled: user?.role === "CLIENT" && Boolean(currentFormId),
    staleTime: 30_000,
  });

  const currentForm = currentFormQuery.data ?? null;
  const initials = (user?.name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const navItems = user?.role === "ADMIN" ? buildAdminNavItems() : buildClientNavItems(currentForm, currentFormId);

  function handleNav(item: NavItem) {
    if (!item.enabled || !item.to) return;
    setDrawerOpen(false);
    nav(item.to);
  }

  function renderDesktopNav(item: NavItem) {
    const active = isActivePath(location.pathname, item);

    return (
      <Button
        key={item.key}
        onClick={() => handleNav(item)}
        disabled={!item.enabled}
        variant="text"
        sx={{
          borderRadius: 999,
          color: active ? "text.primary" : "text.secondary",
          fontSize: 14,
          minWidth: "auto",
          opacity: item.enabled ? 1 : 0.46,
          px: 1.5,
          position: "relative",
          "&::after": active
            ? {
                content: '""',
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 6,
                height: 3,
                borderRadius: 999,
                backgroundColor: "primary.main",
              }
            : {},
        }}
      >
        {item.label}
      </Button>
    );
  }

  function renderMobileNav(item: NavItem) {
    const active = isActivePath(location.pathname, item);

    return (
      <Button
        key={item.key}
        onClick={() => handleNav(item)}
        disabled={!item.enabled}
        variant={active ? "contained" : "outlined"}
        color={active ? "primary" : "inherit"}
        sx={{
          alignItems: "flex-start",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          px: 2,
          py: 1.4,
          textAlign: "left",
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 800, width: "100%" }}>{item.label}</Typography>
        {item.helper ? (
          <Typography sx={{ fontSize: 12, lineHeight: 1.4, mt: 0.35, opacity: active ? 0.86 : 1, width: "100%" }}>
            {item.enabled ? "Área disponível" : item.helper}
          </Typography>
        ) : null}
      </Button>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(16px)",
          backgroundColor: "rgba(246,244,239,0.9)",
          borderBottom: "1px solid rgba(20,32,51,0.08)",
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3.5 } }}>
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 84 }}>
            <Box
              onClick={() => nav(user?.role === "ADMIN" ? "/admin" : "/inicio")}
              sx={{ cursor: "pointer", minWidth: 0 }}
            >
              <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1 }}>
                Trilha de Implantação Honorarium
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 12.5, mt: 0.45 }}>
                {title}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={0.25}
              sx={{
                display: { xs: "none", lg: "flex" },
                flex: 1,
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              {navItems.map(renderDesktopNav)}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
              {user?.role === "CLIENT" ? (
                <Chip
                  label={statusLabel(currentForm)}
                  size="small"
                  sx={{
                    display: { xs: "none", md: "inline-flex" },
                    bgcolor: "rgba(20,32,51,0.06)",
                    color: "text.primary",
                    px: 0.5,
                  }}
                />
              ) : null}

              <IconButton
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir navegação principal"
                sx={{ display: { xs: "inline-flex", lg: "none" } }}
              >
                <MenuRoundedIcon />
              </IconButton>

              <IconButton onClick={(event) => setAnchor(event.currentTarget)} aria-label="Menu do usuário">
                <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.main", fontWeight: 800 }}>{initials}</Avatar>
              </IconButton>
            </Stack>

            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem disabled>
                <Box>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  nav(user?.role === "ADMIN" ? "/admin" : "/inicio");
                }}
              >
                Início
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  setAnchor(null);
                  await logout();
                  nav("/login");
                }}
              >
                <LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Sair
              </MenuItem>
            </Menu>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Navegação principal
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 13, mb: 2 }}>
            Acesse as áreas disponíveis da trilha.
          </Typography>
          <Stack spacing={1}>{navItems.map(renderMobileNav)}</Stack>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontWeight: 800 }}>{user?.name}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{user?.email}</Typography>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
