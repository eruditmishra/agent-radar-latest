export type IntegrationProvider = "aws" | "azure" | "gcp" | "github" | "gitlab";
export type IntegrationStatus = "active" | "inactive" | "error";

export interface AwsConfig {
  region: string;
  accountId: string;
}
export interface AwsSecrets {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface AzureConfig {
  subscriptionId: string;
  clientId: string;
  tenantId: string;
}
export interface AzureSecrets {
  clientSecret: string;
}

export interface GcpConfig {
  projectId: string;
  clientEmail: string;
}
export interface GcpSecrets {
  privateKey: string;
}

export interface GithubConfig {
  orgOrUser?: string;
  apiBase?: string;
}
export interface GithubSecrets {
  token: string;
}

export interface GitlabConfig {
  host?: string;
  projectGroup?: string;
}
export interface GitlabSecrets {
  token: string;
}

export type ProviderInput =
  | { provider: "aws"; config: AwsConfig; secrets: AwsSecrets }
  | { provider: "azure"; config: AzureConfig; secrets: AzureSecrets }
  | { provider: "gcp"; config: GcpConfig; secrets: GcpSecrets }
  | { provider: "github"; config: GithubConfig; secrets: GithubSecrets }
  | { provider: "gitlab"; config: GitlabConfig; secrets: GitlabSecrets };

export interface IntegrationConnection {
  id: string;
  tenant_id: string | null;
  name: string;
  provider: IntegrationProvider;
  environment: string;
  config: Record<string, unknown>;
  secrets_encrypted: string;
  status: IntegrationStatus;
  last_tested_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Client-safe view of an integration (no secrets) */
export interface IntegrationConnectionView {
  id: string;
  name: string;
  provider: IntegrationProvider;
  environment: string;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/** Used when passing the decrypted integration to scanners */
export interface DecryptedIntegration {
  id: string;
  name: string;
  provider: IntegrationProvider;
  environment: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}
