import React from "react";
import { Card, CardContent, Grid, Typography, TextField, InputAdornment } from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputMask from "react-input-mask";
import { OfficeSchema, type OfficeValues } from "../wizardTypes";

export function StepOffice({
  defaultValues,
  onAutoSave,
}: {
  defaultValues?: Partial<OfficeValues>;
  onAutoSave: (data: OfficeValues) => void;
}) {
  const form = useForm<OfficeValues>({
    resolver: zodResolver(OfficeSchema),
    mode: "onChange",
    defaultValues: {
      officeName: defaultValues?.officeName ?? "",
      responsibleName: defaultValues?.responsibleName ?? "",
      whatsapp: defaultValues?.whatsapp ?? "",
      email: defaultValues?.email ?? "",
      cityUf: defaultValues?.cityUf ?? "",
      activeCompanies: defaultValues?.activeCompanies ?? 0,
    },
  });

  React.useEffect(() => {
    const sub = form.watch(() => {
      const t = setTimeout(() => {
        const values = form.getValues();
        const ok = OfficeSchema.safeParse(values);
        if (ok.success) onAutoSave(ok.data);
      }, 600);
      return () => clearTimeout(t);
    });
    return () => sub.unsubscribe();
  }, [form.watch]);

  const { errors } = form.formState;

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>Dados do escritório</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Preencha com calma — salvamos automaticamente quando os campos estiverem válidos.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nome do escritório"
              fullWidth
              {...form.register("officeName")}
              error={Boolean(errors.officeName)}
              helperText={errors.officeName?.message}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Nome do responsável"
              fullWidth
              {...form.register("responsibleName")}
              error={Boolean(errors.responsibleName)}
              helperText={errors.responsibleName?.message}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <InputMask mask="(99) 99999-9999" value={form.getValues("whatsapp")} onChange={form.register("whatsapp").onChange}>
              {(inputProps: any) => (
                <TextField
                  {...inputProps}
                  label="WhatsApp"
                  fullWidth
                  error={Boolean(errors.whatsapp)}
                  helperText={errors.whatsapp?.message ?? "Ex.: (47) 99999-9999"}
                  inputProps={{ ...inputProps.inputProps, inputMode: "tel" }}
                />
              )}
            </InputMask>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="E-mail"
              type="email"
              fullWidth
              {...form.register("email")}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Cidade/UF"
              fullWidth
              {...form.register("cityUf")}
              error={Boolean(errors.cityUf)}
              helperText={errors.cityUf?.message ?? "Ex.: Itajaí/SC"}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Quantidade de empresas ativas"
              type="number"
              fullWidth
              {...form.register("activeCompanies")}
              error={Boolean(errors.activeCompanies)}
              helperText={errors.activeCompanies?.message}
              inputProps={{ min: 0 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">#</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
