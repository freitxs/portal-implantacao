import React from "react";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

export function StepWelcome({ onStart }: { onStart: () => void }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AutoAwesomeRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Boas-vindas</Typography>
        </Box>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Essa jornada leva poucos minutos. Já vem com sugestões prontas e você pode editar se quiser.
          Vamos montar uma base de precificação e anexar seus modelos de contrato e proposta.
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" size="large" onClick={onStart}>Começar</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
