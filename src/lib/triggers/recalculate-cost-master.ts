/**
 * Trigger cost master recalculation after data save.
 * Called client-side after employees/equipment/financials are saved.
 */
export async function triggerCostMasterRecalculation(fiscalYear?: number) {
  try {
    const year = fiscalYear || new Date().getFullYear();
    await fetch("/api/cost-masters/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscalYear: year }),
    });
  } catch {
    // Silently fail - this is a background operation
    console.warn("Cost master recalculation trigger failed");
  }
}
