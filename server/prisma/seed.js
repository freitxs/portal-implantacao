import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
function currency(n) {
    return Math.round(n * 100) / 100;
}
const SECTORS = ["COMERCIO", "SERVICOS", "INDUSTRIA", "MISTO", "NAO_SEI"];
const REGIMES = ["SIMPLES", "PRESUMIDO", "REAL"];
function baseRowsFor(regime, sector) {
    // base simples e fácil de ajustar depois
    const base = regime === "SIMPLES" ? 450 :
        regime === "PRESUMIDO" ? 650 :
            950;
    const sectorFactor = sector === "SERVICOS" ? 1.0 :
        sector === "COMERCIO" ? 1.05 :
            sector === "INDUSTRIA" ? 1.12 :
                sector === "MISTO" ? 1.08 :
                    1.0;
    const steps = [1, 1.2, 1.45, 1.85, 2.4, 2.9, 3.6];
    const faixas = [
        "Até R$ 180.000,00",
        "R$ 180.000,01 a R$ 360.000,00",
        "R$ 360.000,01 a R$ 720.000,00",
        "R$ 720.000,01 a R$ 1.800.000,00",
        "R$ 1.800.000,01 a R$ 3.600.000,00",
        "R$ 3.600.000,01 a R$ 4.200.000,00",
        "Acima de R$ 4.200.000,01",
    ];
    return faixas.map((faixaLabel, i) => ({
        faixaId: `F${i + 1}`,
        faixaLabel,
        value: currency(base * sectorFactor * steps[i]),
    }));
}
async function main() {
    // Users
    const adminEmail = "admin@demo.com";
    const clientEmail = "cliente@demo.com";
    const adminPass = await bcrypt.hash("Admin@123", 10);
    const clientPass = await bcrypt.hash("Cliente@123", 10);
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: { name: "Admin Demo", email: adminEmail, passwordHash: adminPass, role: "ADMIN" },
    });
    const client = await prisma.user.upsert({
        where: { email: clientEmail },
        update: {},
        create: { name: "Cliente Demo", email: clientEmail, passwordHash: clientPass, role: "CLIENT" },
    });
    // Pricing templates (sector + regime)
    for (const sector of SECTORS) {
        for (const regime of REGIMES) {
            const rows = baseRowsFor(regime, sector);
            await prisma.pricingTemplate.upsert({
                where: { sector_regime: { sector, regime } },
                update: { rows: JSON.stringify(rows) },
                create: { sector, regime, rows: JSON.stringify(rows) },
            });
        }
    }
    // Create an initial draft form for the demo client (optional)
    const existingDraft = await prisma.onboardingForm.findFirst({
        where: { userId: client.id, status: "RASCUNHO" },
    });
    if (!existingDraft) {
        const form = await prisma.onboardingForm.create({
            data: {
                userId: client.id,
                status: "RASCUNHO",
                currentStep: 0,
                stepData: JSON.stringify({
                    office: {
                        officeName: "Escritório Exemplo",
                        responsibleName: "Fulano de Tal",
                        whatsapp: "",
                        email: clientEmail,
                        cityUf: "Itajaí/SC",
                        activeCompanies: 12,
                    },
                    profile: {
                        regimes: ["SIMPLES", "PRESUMIDO"],
                        sectors: ["SERVICOS", "COMERCIO"],
                    },
                    uploads: {
                        contractNotes: "",
                        proposalNotes: "",
                    },
                }),
            },
        });
        for (const sector of ["SERVICOS", "COMERCIO"]) {
            for (const regime of REGIMES) {
                const template = await prisma.pricingTemplate.findUnique({ where: { sector_regime: { sector, regime } } });
                await prisma.pricingTable.create({
                    data: { formId: form.id, sector, regime, rows: template?.rows ?? "[]" },
                });
            }
        }
    }
    console.log("Seed concluído.");
    console.log("Login admin:", adminEmail, "senha: Admin@123");
    console.log("Login cliente:", clientEmail, "senha: Cliente@123");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => prisma.$disconnect());
