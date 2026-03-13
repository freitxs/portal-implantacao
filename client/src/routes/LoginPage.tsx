import React from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../state/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import honorariumLogo from "../assets/honorarium-logo.png";

export function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (user) nav("/");
  }, [user]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: { xs: 2, md: 3 },
        background:
          "radial-gradient(900px 460px at 15% 0%, rgba(53, 199, 89, 0.14), transparent), radial-gradient(700px 380px at 100% 100%, rgba(53, 199, 89, 0.1), transparent), linear-gradient(135deg, #050708 0%, #0B1112 45%, #111A16 100%)",
      }}
    >
      <Box
        sx={{
          width: "min(1080px, 100%)",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.34)",
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(7,10,10,0.88)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            p: { xs: 3, sm: 4, md: 6 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: "common.white",
            background: "linear-gradient(180deg, rgba(20,26,24,0.92) 0%, rgba(8,12,11,0.94) 100%)",
          }}
        >
          <Box>
            <Box
              component="img"
              src={honorariumLogo}
              alt="Honorarium"
              sx={{ width: 90, height: 90, objectFit: "contain", mb: 3, filter: "drop-shadow(0 0 22px rgba(53,199,89,0.22))" }}
            />
            <Typography sx={{ fontSize: { xs: 30, md: 42 }, lineHeight: 1.05, fontWeight: 900, maxWidth: 520, mb: 1.5 }}>
              Honorarium
            </Typography>
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: "rgba(255,255,255,0.76)", maxWidth: 520, mb: 3 }}>
              Acesse a jornada de implantação com uma experiência mais organizada e alinhada à identidade visual da plataforma.
            </Typography>

            <Stack spacing={1.2} sx={{ maxWidth: 520 }}>
              {[
                "Inicie ou retome o preenchimento do onboarding",
                "Acompanhe as informações enviadas com mais clareza",
                "Centralize precificação, contratos, usuários e uploads",
              ].map((item) => (
                <Alert
                  key={item}
                  icon={false}
                  sx={{
                    color: "common.white",
                    bgcolor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 3,
                    "& .MuiAlert-message": { py: 0.25 },
                  }}
                >
                  {item}
                </Alert>
              ))}
            </Stack>
          </Box>

          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13, mt: 4 }}>
            Plataforma Honorarium • Implantação comercial, precificação e jornada do cliente
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 0, backgroundColor: "#FFFFFF" }}>
          <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 }, height: "100%", display: "flex", alignItems: "center" }}>
            <Box sx={{ width: "100%" }}>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, color: "#0F1720" }}>
                Entrar
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Use seu e-mail e senha para acessar o portal do Honorarium.
              </Typography>

              <Box
                component="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  try {
                    await login(email, password);
                    toast({ message: "Login realizado com sucesso.", severity: "success" });
                    nav("/");
                  } catch (err: any) {
                    toast({ message: err?.response?.data?.message ?? "Não foi possível entrar.", severity: "error" });
                  } finally {
                    setLoading(false);
                  }
                }}
                sx={{ display: "grid", gap: 2 }}
              >
                <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
                <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 1, py: 1.4, fontWeight: 800, borderRadius: 3 }}
                >
                  {loading ? <CircularProgress size={22} /> : "Acessar portal"}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
