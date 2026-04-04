import { prisma } from "./prisma";

interface AuditLogEntry {
  companyId: string;
  userId?: string;
  tableName: string;
  recordId: string;
  action: "create" | "update" | "delete";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  source?: string;
}

export async function createAuditLog(entry: AuditLogEntry) {
  return prisma.auditLog.create({
    data: {
      companyId: entry.companyId,
      userId: entry.userId,
      tableName: entry.tableName,
      recordId: entry.recordId,
      action: entry.action,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      source: entry.source || "manual",
    },
  });
}

export async function createAuditLogs(entries: AuditLogEntry[]) {
  if (entries.length === 0) return;
  return prisma.auditLog.createMany({
    data: entries.map((e) => ({
      companyId: e.companyId,
      userId: e.userId,
      tableName: e.tableName,
      recordId: e.recordId,
      action: e.action,
      fieldName: e.fieldName,
      oldValue: e.oldValue,
      newValue: e.newValue,
      source: e.source || "manual",
    })),
  });
}

/**
 * Diff two objects and return audit log entries for changed fields.
 */
export function diffForAudit(
  companyId: string,
  userId: string | undefined,
  tableName: string,
  recordId: string,
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): AuditLogEntry[] {
  const entries: AuditLogEntry[] = [];
  for (const key of Object.keys(newObj)) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      entries.push({
        companyId,
        userId,
        tableName,
        recordId,
        action: "update",
        fieldName: key,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      } as AuditLogEntry);
    }
  }
  return entries;
}
