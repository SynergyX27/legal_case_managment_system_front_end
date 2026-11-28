// Built-in collection IDs are stable; field values remain independent of navigation.
const collections = [
  { field: "visLO", label: "VIS - LO", id: "vis-lo", description: "Visuals Lockout" },
  { field: "visTO", label: "VIS - TO", id: "vis-to", description: "VIS - TO visuals" },
  { field: "visRI", label: "VIS - RI", id: "vis-ri", description: "VIS - RI visuals" },
] as const;
export function visualCollection(field: string) {
  return collections.find((c) => c.field === field || c.label === field);
}
export function visualCollectionTarget(caseId: string, field: string) {
  const c = visualCollection(field);
  return c && caseId ? { caseId, collectionId: c.id } : undefined;
}
export function visualCollectionHref(caseId: string, field: string) {
  const t = visualCollectionTarget(caseId, field);
  return t ? "/documents?" + new URLSearchParams(t).toString() : undefined;
}
