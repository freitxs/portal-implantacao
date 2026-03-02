import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Chip,
} from "@mui/material";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { PricingTable, Regime, PricingRow, Sector } from "../../../types";

const defaultFaixas = [
  "Até R$ 180.000,00",
  "R$ 180.000,01 a R$ 360.000,00",
  "R$ 360.000,01 a R$ 720.000,00",
  "R$ 720.000,01 a R$ 1.800.000,00",
  "R$ 1.800.000,01 a R$ 3.600.000,00",
  "R$ 3.600.000,01 a R$ 4.200.000,00",
  "Acima de R$ 4.200.000,01",
];

const sectorLabel: Record<Sector, string> = {
  COMERCIO: "Comércio",
  SERVICOS: "Serviços",
  INDUSTRIA: "Indústria",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCurrencyInput(s: string) {
  const cleaned = s.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

type BulkAction = "PLUS_10" | "MINUS_10" | "ROUND_100";
type DraftMap = Record<string, PricingRow[]>;

function keyOf(sector: Sector, regime: Regime) {
  return `${sector}:${regime}`;
}

export function StepPricing({
  selectedRegimes,
  selectedSectors,
  pricingTables,
  onAutoSave,
}: {
  selectedRegimes: Regime[];
  selectedSectors: Sector[];
  pricingTables: PricingTable[];
  onAutoSave: (
    tables: Array<{ sector: Sector; regime: Regime; rows: PricingRow[] }>,
  ) => void;
}) {
  const regimesToShow = selectedRegimes.length
    ? selectedRegimes
    : (["SIMPLES", "PRESUMIDO", "REAL"] as Regime[]);
  const sectorsToShow = selectedSectors.length
    ? selectedSectors
    : (["SERVICOS"] as Sector[]);

  const [sectorTab, setSectorTab] = React.useState<Sector>(sectorsToShow[0]);
  const [regimeTab, setRegimeTab] = React.useState<Regime>(
    regimesToShow[0] ?? "SIMPLES",
  );

  React.useEffect(() => {
    if (!sectorsToShow.includes(sectorTab)) setSectorTab(sectorsToShow[0]);
  }, [sectorsToShow.join(","), sectorTab]);

  React.useEffect(() => {
    if (!regimesToShow.includes(regimeTab)) setRegimeTab(regimesToShow[0]);
  }, [regimesToShow.join(","), regimeTab]);

  const initialDraft = React.useMemo<DraftMap>(() => {
    const out: DraftMap = {};
    for (const s of sectorsToShow) {
      for (const r of ["SIMPLES", "PRESUMIDO", "REAL"] as Regime[]) {
        const t = pricingTables.find((p) => p.sector === s && p.regime === r);
        out[keyOf(s, r)] = (t?.rows ?? []).map((x: any) => ({
          ...x,
          value: Number(x.value),
        }));
      }
    }
    return out;
  }, [pricingTables, sectorsToShow.join(",")]);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftMap>(() => initialDraft);
  const [backup, setBackup] = React.useState<DraftMap>(() => initialDraft);
  const [errors, setErrors] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editing) {
      setDraft(initialDraft);
      setBackup(initialDraft);
    }
  }, [initialDraft, editing]);

  function validateRows(rows: PricingRow[], s: Sector, r: Regime) {
    const labels = rows.map((x) => x.faixaLabel.trim());
    const dup = labels.find((l, idx) => labels.indexOf(l) !== idx);
    if (dup)
      return `Não é permitido duplicar faixas em ${sectorLabel[s]} (${r}).`;
    const bad = rows.find((x) => Number(x.value) <= 0);
    if (bad)
      return `O valor precisa ser maior que zero em ${sectorLabel[s]} (${r}).`;
    return null;
  }

  function onEdit() {
    setEditing(true);
    setBackup(JSON.parse(JSON.stringify(draft)));
    setErrors(null);
  }

  function onCancel() {
    setDraft(JSON.parse(JSON.stringify(backup)));
    setEditing(false);
    setErrors(null);
  }

  function onRestoreSuggestion() {
    setDraft(JSON.parse(JSON.stringify(backup)));
    setErrors(null);
  }

  function onSave() {
    const k = keyOf(sectorTab, regimeTab);
    const err = validateRows(draft[k] ?? [], sectorTab, regimeTab);
    if (err) {
      setErrors(err);
      return;
    }

    setEditing(false);
    setErrors(null);

    const payload: Array<{
      sector: Sector;
      regime: Regime;
      rows: PricingRow[];
    }> = [];
    for (const s of sectorsToShow) {
      for (const r of ["SIMPLES", "PRESUMIDO", "REAL"] as Regime[]) {
        payload.push({ sector: s, regime: r, rows: draft[keyOf(s, r)] ?? [] });
      }
    }
    onAutoSave(payload);
  }

  function applyBulk(action: BulkAction) {
    if (!editing) return;
    const k = keyOf(sectorTab, regimeTab);
    setDraft((prev) => {
      const next = { ...prev };
      next[k] = (prev[k] ?? []).map((row) => {
        let v = Number(row.value);
        if (action === "PLUS_10") v = v * 1.1;
        if (action === "MINUS_10") v = v * 0.9;
        if (action === "ROUND_100") v = Math.round(v / 100) * 100;
        return { ...row, value: Math.max(1, Math.round(v * 100) / 100) };
      });
      return next;
    });
  }

  const currentKey = keyOf(sectorTab, regimeTab);
  const rows = draft[currentKey] ?? [];

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Tabela & Valores Sugeridos
            </Typography>
            <Typography color="text.secondary">
              Preenchemos com uma base recomendada. Se quiser personalizar,
              clique em <strong>Editar</strong>.
            </Typography>
          </Box>

          {!editing ? (
            <Button
              variant="contained"
              startIcon={<TuneRoundedIcon />}
              onClick={onEdit}
            >
              Editar
            </Button>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                color="secondary"
                startIcon={<SaveRoundedIcon />}
                onClick={onSave}
              >
                Salvar
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloseRoundedIcon />}
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                variant="text"
                startIcon={<RestartAltRoundedIcon />}
                onClick={onRestoreSuggestion}
              >
                Restaurar sugestão
              </Button>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
          Setor
        </Typography>
        <Tabs
          value={sectorTab}
          onChange={(_, v) => setSectorTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Abas por setor"
        >
          {sectorsToShow.map((s) => (
            <Tab key={s} value={s} label={sectorLabel[s]} />
          ))}
        </Tabs>

        <Box sx={{ mt: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
          Regime
        </Typography>
        <Tabs
          value={regimeTab}
          onChange={(_, v) => setRegimeTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Abas por regime"
        >
          {regimesToShow.map((r) => (
            <Tab
              key={r}
              value={r}
              label={
                r === "SIMPLES"
                  ? "Simples Nacional"
                  : r === "PRESUMIDO"
                    ? "Lucro Presumido"
                    : "Lucro Real"
              }
            />
          ))}
        </Tabs>

        <Box
          sx={{
            mt: 2,
            border: "1px solid rgba(16,24,40,0.08)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              background: "rgba(30,94,255,0.06)",
              px: 2,
              py: 1.2,
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>
              Faixa de faturamento
            </Typography>
            <Typography sx={{ fontWeight: 800 }}>Valor sugerido</Typography>
          </Box>

          {rows.map((r, idx) => (
            <Box
              key={r.faixaId}
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                px: 2,
                py: 1.2,
                borderTop: "1px solid rgba(16,24,40,0.06)",
                alignItems: "center",
              }}
            >
              {!editing ? (
                <>
                  <Typography color="text.secondary">{r.faixaLabel}</Typography>
                  <Typography sx={{ fontWeight: 800 }}>
                    {formatCurrency(Number(r.value))}
                  </Typography>
                </>
              ) : (
                <>
                  <TextField
                    label="Faixa de faturamento"
                    value={r.faixaLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) => {
                        const next = { ...prev };
                        next[currentKey] = [...(prev[currentKey] ?? [])];
                        next[currentKey][idx] = {
                          ...next[currentKey][idx],
                          faixaLabel: v,
                        };
                        return next;
                      });
                    }}
                    fullWidth
                    size="small"
                    placeholder="Ex.: Até R$ 200.000,00"
                    inputProps={{ maxLength: 60 }}
                  />

                  <TextField
                    label="Valor"
                    value={String(r.value)}
                    onChange={(e) => {
                      const v = parseCurrencyInput(e.target.value);
                      setDraft((prev) => {
                        const next = { ...prev };
                        next[currentKey] = [...(prev[currentKey] ?? [])];
                        next[currentKey][idx] = {
                          ...next[currentKey][idx],
                          value: v,
                        };
                        return next;
                      });
                    }}
                    fullWidth
                    size="small"
                    inputProps={{ inputMode: "decimal" }}
                  />
                </>
              )}
            </Box>
          ))}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
          sx={{ mt: 2 }}
        >
          <Chip
            label={editing ? "Modo edição" : "Somente leitura"}
            color={editing ? "secondary" : "default"}
            size="small"
          />
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            disabled={!editing}
            onClick={() => applyBulk("PLUS_10")}
          >
            +10%
          </Button>
          <Button
            variant="outlined"
            disabled={!editing}
            onClick={() => applyBulk("MINUS_10")}
          >
            -10%
          </Button>
          <Button
            variant="outlined"
            disabled={!editing}
            onClick={() => applyBulk("ROUND_100")}
          >
            Arredondar p/ centena
          </Button>
        </Stack>

        {errors && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              border: "1px solid rgba(244,63,94,0.35)",
              background: "rgba(244,63,94,0.08)",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: "#b42318" }}>
              Ajuste necessário
            </Typography>
            <Typography color="#b42318">{errors}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
