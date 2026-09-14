import type { Request, Response, NextFunction } from "express";
import * as svc from "./integrations.service";
import type { IntegrationProvider } from "./integrations.types";

function getTenant(req: Request) {
  return (req as any).tenantId || null;
}

export async function createIntegrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = getTenant(req);
    const user = (req as any).user;
    const result = await svc.createIntegration(tenantId, {
      ...req.body,
      createdBy: {
        userId: user?.sub ?? null,
        userEmail: user?.email ?? null,
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          null,
      },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateIntegrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = getTenant(req);
    const user = (req as any).user;
    const result = await svc.updateIntegration(
      req.params.integrationId,
      tenantId,
      req.body,
      {
        userId: user?.sub ?? null,
        userEmail: user?.email ?? null,
      },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getIntegrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = getTenant(req);
    const result = await svc.getIntegration(req.params.integrationId, tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listIntegrationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = getTenant(req);
    const { provider, status, limit, offset } = req.query;
    const result = await svc.listIntegrations(tenantId, {
      provider: provider as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteIntegrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = getTenant(req);
    const user = (req as any).user;
    await svc.deleteIntegration(req.params.integrationId, tenantId, {
      userId: user?.sub ?? null,
      userEmail: user?.email ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function testIntegrationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = getTenant(req);
    const user = (req as any).user;
    const result = await svc.testIntegration(req.params.integrationId, tenantId, {
      userId: user?.sub ?? null,
      userEmail: user?.email ?? null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
