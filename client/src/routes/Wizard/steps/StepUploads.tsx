import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import type { OnboardingForm, Upload, UploadType } from "../../../types";
import { api, API_URL } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import { useMutation } from "@tanstack/react-query";
import { UploadNotesSchema, type UploadNotesValues } from "../wizardTypes";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function acceptLabel() {
  return ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function UploadCard({
  title,
  type,
  upload,
  notes,
  setNotes,
  formId,
  noTemplate,
  setNoTemplate,
}: {
  title: string;
  type: UploadType;
  upload?: Upload;
  notes: string;
  setNotes: (v: string) => void;
  formId: string;
  noTemplate: boolean;
  setNoTemplate: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [progress, setProgress] = React.useState<number | null>(null);

  const up = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);

      const { data } = await api.post(`/api/uploads/${formId}/uploads/${type}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (!e.total) return;
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      return data.upload as Upload;
    },
    onSuccess: () => {
      toast({ message: "Upload concluído.", severity: "success" });
      setProgress(null);
      window.location.reload();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Falha no upload.", severity: "error" });
      setProgress(null);
    },
  });

  const del = useMutation({
    mutationFn: async () => (await api.delete(`/api/uploads/${formId}/uploads/${type}`)).data,
    onSuccess: () => {
      toast({ message: "Arquivo removido.", severity: "success" });
      window.location.reload();
    },
    onError: (err: any) => toast({ message: err?.response?.data?.message ?? "Falha ao remover.", severity: "error" }),
  });

  return (
    <Card sx={{ height: "100%" }}>
      {progress !== null && <LinearProgress variant="determinate" value={progress} />}
      <CardContent sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 900, mb: 0.5 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Envie um arquivo em PDF/DOC/DOCX (até 10MB).
        </Typography>

        {!upload ? (
          <Button
            variant="contained"
            startIcon={up.isPending ? <CircularProgress size={18} /> : <CloudUploadRoundedIcon />}
            component="label"
            disabled={up.isPending}
          >
            Selecionar arquivo
            <input
              hidden
              type="file"
              accept={acceptLabel()}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 10 * 1024 * 1024) {
                  toast({ message: "Arquivo excede 10MB.", severity: "warning" });
                  return;
                }
                up.mutate(f);
              }}
            />
          </Button>
        ) : (
          <Box sx={{ border: "1px solid rgba(16,24,40,0.08)", borderRadius: 3, p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 800 }}>{upload.filename}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatBytes(upload.size)} • {upload.mimetype}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" component="a" href={`${API_URL}/api/uploads/download/${upload.id}`} target="_blank" rel="noreferrer">
                  Baixar
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => del.mutate()}>
                  Remover
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Button variant="text" component="label">
              Substituir arquivo
              <input
                hidden
                type="file"
                accept={acceptLabel()}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 10 * 1024 * 1024) {
                    toast({ message: "Arquivo excede 10MB.", severity: "warning" });
                    return;
                  }
                  up.mutate(f);
                }}
              />
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 1.5 }}>
          <FormControlLabel
            control={<Checkbox checked={noTemplate} onChange={(e) => setNoTemplate(e.target.checked)} />}
            label={type === "CONTRATO" ? "Não possuo template de contrato" : "Não possuo template de proposta"}
          />
        </Box>

        <TextField
          label={`Observações do ${type === "CONTRATO" ? "contrato" : "proposta"} (opcional)`}
          multiline
          minRows={3}
          fullWidth
          sx={{ mt: 2 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </CardContent>
    </Card>
  );
}

export function StepUploads({
  form,
  onAutoSave,
}: {
  form: OnboardingForm;
  onAutoSave: (notes: UploadNotesValues) => void;
}) {
  const stepData = form.stepData ?? {};
  const initial = UploadNotesSchema.parse(stepData.uploads ?? {});
  const [contractNotes, setContractNotes] = React.useState(initial.contractNotes ?? "");
  const [proposalNotes, setProposalNotes] = React.useState(initial.proposalNotes ?? "");
  const [noContractTemplate, setNoContractTemplate] = React.useState(Boolean((initial as any).noContractTemplate));
  const [noProposalTemplate, setNoProposalTemplate] = React.useState(Boolean((initial as any).noProposalTemplate));

  React.useEffect(() => {
    const t = setTimeout(() => {
      const ok = UploadNotesSchema.safeParse({ contractNotes, proposalNotes, noContractTemplate, noProposalTemplate });
      if (ok.success) onAutoSave(ok.data);
    }, 700);
    return () => clearTimeout(t);
  }, [contractNotes, proposalNotes, noContractTemplate, noProposalTemplate]);

  const contract = form.uploads?.find((u) => u.type === "CONTRATO");
  const proposal = form.uploads?.find((u) => u.type === "PROPOSTA");

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Upload de modelos
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Anexe seus modelos para usarmos na implantação. (Você pode substituir depois.)
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <UploadCard
            title="Modelo de Contrato"
            type="CONTRATO"
            upload={contract as any}
            notes={contractNotes}
            setNotes={setContractNotes}
            formId={form.id}
            noTemplate={noContractTemplate}
            setNoTemplate={setNoContractTemplate}
          />
          <UploadCard
            title="Modelo de Proposta"
            type="PROPOSTA"
            upload={proposal as any}
            notes={proposalNotes}
            setNotes={setProposalNotes}
            formId={form.id}
            noTemplate={noProposalTemplate}
            setNoTemplate={setNoProposalTemplate}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
