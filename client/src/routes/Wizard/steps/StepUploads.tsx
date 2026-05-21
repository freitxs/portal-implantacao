import React from "react";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { OnboardingForm } from "../../../types";
import { UploadNotesSchema, type UploadNotesValues } from "../wizardTypes";

export function StepUploads({
  form,
  onAutoSave,
}: {
  form: OnboardingForm;
  onAutoSave: (notes: UploadNotesValues) => void;
}) {
  const navigate = useNavigate();
  const stepData = form.stepData ?? {};
  const normalized = UploadNotesSchema.parse(stepData.uploads ?? {});
  const serialized = JSON.stringify(normalized);
  const lastEmittedRef = React.useRef(serialized);

  React.useEffect(() => {
    if (serialized !== lastEmittedRef.current) {
      lastEmittedRef.current = serialized;
      onAutoSave(normalized);
    }
  }, [normalized, onAutoSave, serialized]);

  const availableUploads = (form.uploads ?? []).filter((upload) => upload.status !== "EXCLUIDO_ADMIN");

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} justifyContent="space-between">
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
              Central de Arquivos
            </Typography>
            <Typography color="text.secondary">Nesta área você organiza proposta, contrato e relação de clientes.</Typography>
          </Box>
          <Button variant="contained" onClick={() => navigate(`/arquivos/${form.id}`)}>
            Abrir Central de Arquivos
          </Button>
        </Stack>

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, mt: 2.5 }}>
          <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <FolderOpenOutlinedIcon color="action" />
              <Typography sx={{ fontWeight: 800 }}>Proposta comercial</Typography>
            </Stack>
            <Typography color="text.secondary">
              {normalized.noProposalTemplate ? "Modelo Honorarium selecionado ou envio em andamento." : "Envie um modelo próprio ou selecione um modelo Honorarium."}
            </Typography>
          </Box>
          <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 2 }}>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Contrato</Typography>
            <Typography color="text.secondary">
              {normalized.contractAcknowledged ? "Ciência registrada." : "Envie um modelo próprio ou registre ciência do contrato padrão."}
            </Typography>
          </Box>
          <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 2 }}>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Relação de clientes</Typography>
            <Typography color="text.secondary">Baixe o modelo e envie a planilha preenchida em CSV ou XLSX.</Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2.5 }} flexWrap="wrap">
          <Chip label={`${availableUploads.length} arquivo(s) ativo(s)`} />
          <Chip label="Histórico centralizado" variant="outlined" />
          <Chip label="Status por documento" variant="outlined" />
        </Stack>
      </CardContent>
    </Card>
  );
}
