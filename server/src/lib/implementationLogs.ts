import { prisma } from "./prisma.js";

function safeStringifyMetadata(metadata: any) {
  try {
    return JSON.stringify(metadata ?? {});
  } catch {
    return "{}";
  }
}

export async function createImplementationLog(params: {
  formId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
}, client: typeof prisma = prisma) {
  return client.implementationLog.create({
    data: {
      formId: params.formId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: safeStringifyMetadata(params.metadata),
    },
  });
}

export function parseImplementationLog(log: any) {
  return {
    ...log,
    metadata: (() => {
      try {
        if (typeof log?.metadata === "string") return JSON.parse(log.metadata || "{}");
        return log?.metadata ?? {};
      } catch {
        return {};
      }
    })(),
  };
}
