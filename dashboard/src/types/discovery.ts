export interface DiscoveredAgent {
  id: string;
  name: string;
  model: string | null;
  provider: string | null;
  cloud_provider: string | null;
  region: string | null;
  fingerprint: string | null;
  owner: string | null;
  department: string | null;
  business_unit: string | null;
  repository: string | null;
  deployment_type: string | null;
  confidence_score: number | null;
  created_at: string;
  status: string;
  agent_status: string | null;
  
  // Security flags
  api_keys_detected: boolean;
  secrets_detected: boolean;
  internet_access: boolean;
  filesystem_access: boolean;
  database_access: boolean;
  github_access: boolean;
  slack_access: boolean;
  email_access: boolean;
  calendar_access: boolean;
  browser_access: boolean;
  
  // JSONB / Arrays
  mcp_connections: any[];
  tools: any[];
  prompt_templates: any[];
  connected_applications: any[];
  permissions: any[];
  risk_indicators: string[];
  source_collectors: string[];
  metadata: any;
  agent_config: any;
  agent_access: any;
  ownership: any;
  data_access_classification: any;
  mesh: any;
  
  // Other fields
  scan_id: string | null;
  integration_id: string | null;
  how_identified: string | null;
  evidence_reason: string | null;
  evidence_class: string | null;
  updated_at: string;
  
  requested_status?: string | null;
  previous_status?: string | null;
  request_remark?: string | null;
  approval_remark?: string | null;
  findings?: ScanFinding[];
}

export interface ScanFinding {
  finding_type: string;
  severity: 'info' | 'risk' | 'critical';
  details: any;
  created_at: string;
}

export interface AgentFilters {
  models: string[];
  providers: string[];
  owners: string[];
  types: string[];
  statuses: string[];
}

export interface DiscoveredModel {
  id: string;
  tenant_id: string | null;
  name: string;
  display_name: string | null;
  provider: string | null;
  model_type: string;
  version: string | null;
  family: string | null;
  validation_status: 'pending' | 'approved' | 'flagged' | 'deprecated' | 'under_review';
  risk_level: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  agent_count: number;
  first_seen_at: string;
  last_seen_at: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  capabilities: any;
  metadata: any;
  created_at: string;
  updated_at: string;
  requested_status: string | null;
  previous_status: string | null;
}

export interface ModelFilters {
  providers: string[];
  statuses: string[];
  riskLevels: string[];
}
