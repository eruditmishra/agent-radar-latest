export interface RiskFactor {
  name: string;
  points: number;
  applied: boolean;
}

export interface RiskScoreBreakdown {
  rawScore: number;
  finalScore: number;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  components: {
    intrinsicAttackSurface: {
      score: number;
      max: 35;
      factors: RiskFactor[];
    };
    governanceDeficits: {
      score: number;
      max: 25;
      factors: RiskFactor[];
    };
    owaspVulnerabilities: {
      score: number;
      max: 40;
      factors: RiskFactor[];
    };
    unknownMultiplier: {
      applied: boolean;
      multiplier: number;
      reason: string | null;
    };
  };
}

export function calculateAgentRiskScore(
  agent: any,
  assessment: any,
): RiskScoreBreakdown {
  const domains = assessment?.domains || {};
  const owaspControls = assessment?.frameworks?.owasp_ai_agents_2026?.controls || {};
  const completeness = assessment?.evidence_completeness?.overall ?? 0;

  let rawScore = 0;

  // Component A
  let componentA = 0;
  const factorsA: RiskFactor[] = [];

  if (domains?.data_access?.has_pii || domains?.data_access?.has_phi) {
    componentA += 15;
    factorsA.push({
      name: "Access to sensitive data (PII/PHI)",
      points: 15,
      applied: true,
    });
  } else {
    factorsA.push({
      name: "Access to sensitive data (PII/PHI)",
      points: 15,
      applied: false,
    });
  }

  if (agent?.internet_access === true || domains?.network?.internet_access?.value === true) {
    componentA += 10;
    factorsA.push({
      name: "Internet Access Enabled",
      points: 10,
      applied: true,
    });
  } else {
    factorsA.push({
      name: "Internet Access Enabled",
      points: 10,
      applied: false,
    });
  }

  const tools = domains?.tools?.items || [];
  if (
    tools.some(
      (t: any) =>
        t.risk_flags?.can_modify_state || t.risk_flags?.can_execute_code,
    )
  ) {
    componentA += 10;
    factorsA.push({
      name: "State-modifying or code-executing tools present",
      points: 10,
      applied: true,
    });
  } else {
    factorsA.push({
      name: "State-modifying or code-executing tools present",
      points: 10,
      applied: false,
    });
  }

  const finalComponentA = Math.min(35, componentA);
  rawScore += finalComponentA;

  // Component B
  let componentB = 0;
  const factorsB: RiskFactor[] = [];

  if (agent?.status === "shadow") {
    componentB += 15;
    factorsB.push({
      name: "Shadow AI (Unapproved)",
      points: 15,
      applied: true,
    });
  } else {
    factorsB.push({
      name: "Shadow AI (Unapproved)",
      points: 15,
      applied: false,
    });
  }

  if (domains?.guardrails?.present === false) {
    componentB += 5;
    factorsB.push({
      name: "Missing foundational guardrails",
      points: 5,
      applied: true,
    });
  } else {
    factorsB.push({
      name: "Missing foundational guardrails",
      points: 5,
      applied: false,
    });
  }

  if (
    tools.some(
      (t: any) =>
        t.risk_flags?.can_modify_state && t.requires_human_approval === false,
    )
  ) {
    componentB += 5;
    factorsB.push({
      name: "State-modifying tools lack human oversight",
      points: 5,
      applied: true,
    });
  } else {
    factorsB.push({
      name: "State-modifying tools lack human oversight",
      points: 5,
      applied: false,
    });
  }

  const finalComponentB = Math.min(25, componentB);
  rawScore += finalComponentB;

  // Component C
  let componentC = 0;
  const factorsC: RiskFactor[] = [];
  const allOwasp = Object.values(owaspControls) as any[];

  for (const cat of allOwasp) {
    if (cat.status === "detected") {
      componentC += 15;
      factorsC.push({
        name: `Vulnerability detected: ${cat.name || cat.control_id || cat.id}`,
        points: 15,
        applied: true,
      });
    } else if (cat.status === "control_gap") {
      componentC += 5;
      factorsC.push({
        name: `Control gap: ${cat.name || cat.control_id || cat.id}`,
        points: 5,
        applied: true,
      });
    }
  }
  const finalComponentC = Math.min(40, componentC);
  rawScore += finalComponentC;

  // Component D
  let multiplierApplied = false;
  let multiplierReason: string | null = null;
  if (completeness < 0.4) {
    rawScore = Math.min(100, rawScore * 1.2);
    multiplierApplied = true;
    multiplierReason = `Evidence completeness is critically low (${Math.round(completeness * 100)}%)`;
  }

  const finalScore = Math.round(rawScore);
  let riskLevel: "Critical" | "High" | "Medium" | "Low" = "Low";
  if (finalScore > 75) riskLevel = "Critical";
  else if (finalScore > 50) riskLevel = "High";
  else if (finalScore > 25) riskLevel = "Medium";

  return {
    rawScore: Math.round(rawScore),
    finalScore,
    riskLevel,
    components: {
      intrinsicAttackSurface: {
        score: finalComponentA,
        max: 35,
        factors: factorsA,
      },
      governanceDeficits: {
        score: finalComponentB,
        max: 25,
        factors: factorsB,
      },
      owaspVulnerabilities: {
        score: finalComponentC,
        max: 40,
        factors: factorsC,
      },
      unknownMultiplier: {
        applied: multiplierApplied,
        multiplier: 1.2,
        reason: multiplierReason,
      },
    },
  };
}
