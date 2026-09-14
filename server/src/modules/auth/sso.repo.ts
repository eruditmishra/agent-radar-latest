import { db } from "../../db/client";

export interface SSOConfiguration {
  id: string;
  tenant_id: string | null;
  provider_id: string;
  provider_type: 'oidc' | 'saml';
  config: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getActiveSSOConfig(tenantId: string | null): Promise<SSOConfiguration | null> {
  const res = tenantId
    ? await db.query(`SELECT * FROM sso_configurations WHERE tenant_id = $1 AND is_active = true LIMIT 1`, [tenantId])
    : await db.query(`SELECT * FROM sso_configurations WHERE tenant_id IS NULL AND is_active = true LIMIT 1`);
  return res.rows[0] ?? null;
}

export async function getSSOConfig(tenantId: string | null): Promise<SSOConfiguration | null> {
  const res = tenantId
    ? await db.query(`SELECT * FROM sso_configurations WHERE tenant_id = $1 LIMIT 1`, [tenantId])
    : await db.query(`SELECT * FROM sso_configurations WHERE tenant_id IS NULL LIMIT 1`);
  return res.rows[0] ?? null;
}

export async function upsertSSOConfig(
  tenantId: string | null,
  providerId: string,
  providerType: 'oidc' | 'saml',
  config: any,
  isActive: boolean
): Promise<SSOConfiguration> {
  const existing = await getSSOConfig(tenantId);
  
  if (existing) {
    const res = await db.query(
      `UPDATE sso_configurations 
       SET provider_id = $1, provider_type = $2, config = $3, is_active = $4, updated_at = now() 
       WHERE id = $5 RETURNING *`,
      [providerId, providerType, config, isActive, existing.id]
    );
    return res.rows[0];
  } else {
    const res = await db.query(
      `INSERT INTO sso_configurations (tenant_id, provider_id, provider_type, config, is_active) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, providerId, providerType, config, isActive]
    );
    return res.rows[0];
  }
}
