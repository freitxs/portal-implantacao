import React from "react";
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography, Link } from "@mui/material";
import { useAuth } from "../state/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";

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
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, background: "radial-gradient(800px 400px at 30% 0%, rgba(30,94,255,0.18), transparent), #F6F8FC" }}>
      <Card sx={{ width: "min(520px, 100%)" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Bem-vindo 👋</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Acesse para iniciar ou retomar sua jornada de implantação.
          </Typography>

          <Box component="form" onSubmit={async (e) => {
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
          }} sx={{ display: "grid", gap: 2 }}>
            <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
              {loading ? <CircularProgress size={22} /> : "Entrar"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
