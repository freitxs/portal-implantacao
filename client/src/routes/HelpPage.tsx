import React from "react";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { AppShell } from "../components/AppShell";

const helpCards = [
  {
    title: "Como avançar na trilha",
    text: "A etapa inicial reúne as informações e documentos necessários para que a equipe organize a implantação e prepare os próximos marcos.",
    icon: <TaskAltOutlinedIcon color="action" />,
  },
  {
    title: "Documentos e registros",
    text: "As áreas de arquivos, cronograma e agendamento são atualizadas de acordo com a análise do material recebido e com o avanço da revisão.",
    icon: <DescriptionOutlinedIcon color="action" />,
  },
  {
    title: "Canal de apoio",
    text: "Em caso de dúvidas sobre o preenchimento ou sobre a sequência da implantação, utilize os contatos da equipe Honorarium informados no atendimento.",
    icon: <ContactSupportOutlinedIcon color="action" />,
  },
];

export function HelpPage() {
  return (
    <AppShell title="Ajuda e orientações">
      <Stack spacing={3}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Typography variant="h5">Ajuda</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Esta área reúne orientações gerais para acompanhar a Trilha de Implantação Honorarium com clareza.
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          {helpCards.map((card) => (
            <Card key={card.title}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
                  {card.icon}
                  <Typography sx={{ fontWeight: 900 }}>{card.title}</Typography>
                </Stack>
                <Typography color="text.secondary">{card.text}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    </AppShell>
  );
}
