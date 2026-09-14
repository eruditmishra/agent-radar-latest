/**
 * Backward-compatibility shim.
 *
 * All Azure/Entra/Power Platform/Teams/M365 discovery logic that used to be
 * split between azureArm.js and azureDeepScan.js has been merged into a
 * single scanner in azure.deepscanner.ts (see discoverAzureEcosystem, plus the
 * unchanged discoverAzureConnector for ARM-only use).
 *
 * This file re-exports everything from there so existing imports of
 * "./azure.scanner" elsewhere in the codebase keep working without changes.
 * New code should import directly from "./azure.deepscanner".
 * Live cloud discovery uses discoverAzureEcosystem (wired in collectors.js).
 */
export * from "./azure.deepscanner";
