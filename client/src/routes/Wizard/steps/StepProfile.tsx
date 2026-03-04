import React from "react";
import {
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Typography,
  Stack,
  FormHelperText,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileSchema, type ProfileValues } from "../wizardTypes";

const regimes = [
  { value: "SIMPLES", label: "Simples Nacional" },
  { value: "PRESUMIDO", label: "Lucro Presumido" },
  { value: "REAL", label: "Lucro Real" },
] as const;

const sectors = [
  { value: "COMERCIO", label: "Comércio" },
  { value: "SERVICOS", label: "Serviços" },
  { value: "INDUSTRIA", label: "Indústria" },
] as const;

export function StepProfile({
  defaultValues,
  onAutoSave,
}: {
  defaultValues?: Partial<ProfileValues>;
  onAutoSave: (data: ProfileValues) => void;
}) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    mode: "onChange",
    defaultValues: {
      regimes: (defaultValues?.regimes as any) ?? ["SIMPLES"],
      sectors: (defaultValues?.sectors as any) ?? ["SERVICOS"],
    },
  });

  React.useEffect(() => {
    const sub = form.watch(() => {
      const t = setTimeout(() => {
        const values = form.getValues();
        const ok = ProfileSchema.safeParse(values);
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
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Perfil, regimes e setores
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Se você marcar apenas <strong>1 regime</strong>, mostraremos só ele na etapa de tabelas.
          Você pode marcar <strong>mais de um setor</strong> — criaremos uma tabela para cada setor.
        </Typography>

        <Stack spacing={3}>
          <FormControl error={Boolean(errors.regimes)}>
            <FormLabel>Quais regimes você atende hoje?</FormLabel>
            <Controller
              name="regimes"
              control={form.control}
              render={({ field }) => (
                <Stack>
                  {regimes.map((r) => (
                    <FormControlLabel
                      key={r.value}
                      control={
                        <Checkbox
                          checked={field.value?.includes(r.value as any)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next = checked
                              ? [...(field.value ?? []), r.value]
                              : (field.value ?? []).filter((v: any) => v !== r.value);
                            field.onChange(next);
                          }}
                        />
                      }
                      label={r.label}
                    />
                  ))}
                </Stack>
              )}
            />
            <FormHelperText>{errors.regimes?.message as any}</FormHelperText>
          </FormControl>

          <FormControl error={Boolean((errors as any).sectors)}>
            <FormLabel>Selecione o(s) setor(es) que você atende</FormLabel>
            <Controller
              name="sectors"
              control={form.control}
              render={({ field }) => (
                <Stack>
                  {sectors.map((s) => (
                    <FormControlLabel
                      key={s.value}
                      control={
                        <Checkbox
                          checked={field.value?.includes(s.value as any)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next = checked
                              ? [...(field.value ?? []), s.value]
                              : (field.value ?? []).filter((v: any) => v !== s.value);
                            field.onChange(next);
                          }}
                        />
                      }
                      label={s.label}
                    />
                  ))}
                </Stack>
              )}
            />
            <FormHelperText>{(errors as any).sectors?.message as any}</FormHelperText>
          </FormControl>
        </Stack>
      </CardContent>
    </Card>
  );
}
