import * as repo from "./integrations.repo";
import type {
  IntegrationConnection,
  IntegrationProvider,
} from "./integrations.types";
import { encryptSecrets, decryptSecrets } from "../../lib/encryption";
import { NotFoundError, ValidationError } from "../../shared/errors";
import * as audit from "../audit/audit.service";


const REQUIRED_CONFIG: Record<IntegrationProvider, string[]> = {
  aws: ["region", "accountId", "accessKeyId"],
  azure: ["subscriptionId", "clientId", "tenantId"],
  gcp: ["projectId", "clientEmail"],
  github: [],
  gitlab: [],
};

const REQUIRED_SECRETS: Record<IntegrationProvider, string[]> = {
  aws: ["secretAccessKey"],
  azure: ["clientSecret"],
  gcp: ["privateKey"],
  github: ["token"],
  gitlab: ["token"],
};

export function validateProviderInput(
  provider: IntegrationProvider,
  config: Record<string, unknown>,
  secrets: Record<string, unknown>,
): void {
  const missingConfig = REQUIRED_CONFIG[provider].filter((k) => !config[k]);
  const missingSecrets = REQUIRED_SECRETS[provider].filter((k) => !secrets[k]);
  const missing = [
    ...missingConfig.map((k) => `config.${k}`),
    ...missingSecrets.map((k) => `secrets.${k}`),
  ];
  if (missing.length) {
    throw new ValidationError(
      `Missing required fields for provider '${provider}': ${missing.join(", ")}`,
    );
  }
}

// Re-exporting from lib for convenience if used in this file
export { encryptSecrets, decryptSecrets };

export async function createIntegration(
  tenantId: string | null,
  input: {
    name: string;
    provider: IntegrationProvider;
    environment?: string;
    config: Record<string, unknown>;
    secrets: Record<string, unknown>;
    createdBy?: { userId: string | null; userEmail: string | null; ipAddress?: string | null };
  },
): Promise<IntegrationConnection> {
  validateProviderInput(input.provider, input.config, input.secrets);
  const secretsEncrypted = encryptSecrets(input.secrets);
  const result = await repo.createIntegration(tenantId, { ...input, secretsEncrypted });

  // Audit: connector.created
  const safeConfig = { ...input.config } as Record<string, unknown>;
  audit.log({
    tenantId,
    userId: input.createdBy?.userId,
    userEmail: input.createdBy?.userEmail,
    ipAddress: input.createdBy?.ipAddress,
    eventType: "connector.created",
    entityType: "connector",
    entityId: result.id,
    entityName: result.name,
    action: "create",
    summary: `${input.createdBy?.userEmail ?? "system"} added ${input.provider.toUpperCase()} connector '${result.name}' (${input.environment ?? "production"})`,
    after: {
      id: result.id,
      provider: result.provider,
      name: result.name,
      environment: result.environment,
      ...safeConfig,
    },
  });

  return result;
}

export async function updateIntegration(
  id: string,
  tenantId: string | null,
  input: {
    name?: string;
    environment?: string;
    config?: Record<string, unknown>;
    secrets?: Record<string, unknown>;
  },
  updatedBy?: { userId: string | null; userEmail: string | null },
): Promise<IntegrationConnection> {
  const existing = await repo.findIntegrationWithSecrets(id, tenantId);
  if (!existing) throw new NotFoundError("Integration not found");

  const mergedConfig = {
    ...(existing.config as Record<string, unknown>),
    ...(input.config ?? {}),
  };

  // Secrets fields left blank in the edit form mean "keep the existing value" —
  // only overwrite a key when a non-empty replacement was actually provided.
  const existingSecrets = decryptSecrets(existing.secrets_encrypted);
  const mergedSecrets = { ...existingSecrets };
  for (const [key, value] of Object.entries(input.secrets ?? {})) {
    if (value !== undefined && value !== "") {
      mergedSecrets[key] = value;
    }
  }

  validateProviderInput(existing.provider, mergedConfig, mergedSecrets);
  const secretsEncrypted = encryptSecrets(mergedSecrets);

  const result = await repo.updateIntegration(id, tenantId, {
    name: input.name ?? existing.name,
    environment: input.environment ?? existing.environment,
    config: mergedConfig,
    secretsEncrypted,
  });
  if (!result) throw new NotFoundError("Integration not found");

  audit.log({
    tenantId,
    userId: updatedBy?.userId,
    userEmail: updatedBy?.userEmail,
    eventType: "connector.updated",
    entityType: "connector",
    entityId: result.id,
    entityName: result.name,
    action: "update",
    summary: `${updatedBy?.userEmail ?? "system"} updated ${existing.provider.toUpperCase()} connector '${result.name}'`,
    before: {
      id: existing.id,
      provider: existing.provider,
      name: existing.name,
      environment: existing.environment,
      ...(existing.config as Record<string, unknown>),
    },
    after: {
      id: result.id,
      provider: result.provider,
      name: result.name,
      environment: result.environment,
      ...mergedConfig,
    },
  });

  return result;
}

export async function getIntegration(
  id: string,
  tenantId: string | null,
): Promise<IntegrationConnection> {
  const integration = await repo.findIntegrationById(id, tenantId);
  if (!integration) throw new NotFoundError("Integration not found");
  return integration;
}

export async function listIntegrations(
  tenantId: string | null,
  opts: {
    provider?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  return repo.listIntegrations(tenantId, opts);
}

export async function deleteIntegration(
  id: string,
  tenantId: string | null,
  deletedBy?: { userId: string | null; userEmail: string | null },
): Promise<void> {
  // Fetch name before deletion for the audit record
  const existing = await repo.findIntegrationById(id, tenantId);
  const ok = await repo.deleteIntegration(id, tenantId);
  if (!ok) throw new NotFoundError("Integration not found");

  audit.log({
    tenantId,
    userId: deletedBy?.userId,
    userEmail: deletedBy?.userEmail,
    eventType: "connector.deleted",
    entityType: "connector",
    entityId: id,
    entityName: existing?.name ?? id,
    action: "delete",
    summary: `${deletedBy?.userEmail ?? "system"} deleted ${existing?.provider?.toUpperCase() ?? ""} connector '${existing?.name ?? id}'`,
    before: existing
      ? { id: existing.id, provider: existing.provider, name: existing.name, environment: existing.environment }
      : null,
    after: null,
  });
}

export async function loadValidator(provider: IntegrationProvider) {
  try {
    switch (provider) {
      case "aws":
        return (await import("../discovery/scanners/aws/aws.scanner"))
          .validateAwsConnector;
      case "azure":
        return (await import("../discovery/scanners/azure/azure.scanner"))
          .validateAzureConnector;
      case "gcp":
        return (await import("../discovery/scanners/gcp/gcp.scanner"))
          .validateGcpConnector;
      case "github":
        return (await import("../discovery/scanners/git/git.scanner"))
          .validateGithub;
      case "gitlab":
        return (await import("../discovery/scanners/git/git.scanner"))
          .validateGitlab;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (err: any) {
    throw new Error(
      `Scanner module for '${provider}' failed to load: ${err.message}`,
    );
  }
}

export async function testIntegration(
  id: string,
  tenantId: string | null,
  testedBy?: { userId: string | null; userEmail: string | null },
): Promise<{ ok: boolean; message: string }> {
  const row = await repo.findIntegrationWithSecrets(id, tenantId);
  if (!row) throw new NotFoundError("Integration not found");

  const secrets = decryptSecrets(row.secrets_encrypted);
  const connObj = {
    id: row.id,
    name: row.name,
    environment: row.environment,
    provider: row.provider,
    config: row.config,
    secrets,
  };

  let result: { ok: boolean; message: string };
  try {
    const validateFn = await loadValidator(row.provider);
    if (!validateFn) {
      result = { ok: true, message: "No validator implemented for this provider" };
    } else {
      result = await validateFn(connObj);
    }
    const status = result.ok ? "active" : "error";
    const lastError = result.ok ? null : result.message;
    await repo.updateIntegrationStatus(row.id, status, lastError);
  } catch (err: any) {
    await repo.updateIntegrationStatus(row.id, "error", err.message);
    result = { ok: false, message: err.message };
  }

  // Audit: connector.tested or connector.test_failed
  audit.log({
    tenantId,
    userId: testedBy?.userId,
    userEmail: testedBy?.userEmail,
    eventType: result.ok ? "connector.tested" : "connector.test_failed",
    entityType: "connector",
    entityId: row.id,
    entityName: row.name,
    action: "test",
    status: result.ok ? "success" : "failure",
    summary: result.ok
      ? `${row.name} connectivity test passed`
      : `${row.name} connectivity test failed: ${result.message}`,
    metadata: { message: result.message, provider: row.provider },
  });

  return result;
}

export async function getDecryptedIntegration(
  id: string,
  tenantId: string | null,
) {
  const row = await repo.findIntegrationWithSecrets(id, tenantId);
  if (!row) throw new NotFoundError("Integration not found");
  return {
    ...row,
    secrets: decryptSecrets(row.secrets_encrypted),
  };
}

export async function getActiveDecryptedIntegrations(tenantId: string | null) {
  const rows = await repo.findActiveIntegrationsWithSecrets(tenantId);
  return rows.map((row) => ({
    ...row,
    secrets: decryptSecrets(row.secrets_encrypted),
  }));
}

export async function getDecryptedIntegrationsByIds(
  ids: string[],
  tenantId: string | null,
) {
  const rows = await repo.findIntegrationsByIdsWithSecrets(ids, tenantId);
  return rows.map((row) => ({
    ...row,
    secrets: decryptSecrets(row.secrets_encrypted),
  }));
}
