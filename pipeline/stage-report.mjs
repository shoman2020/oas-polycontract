export function completeStageReport(plannedNames, completedStages) {
  const completedByName = new Map(completedStages.map((stage) => [stage.name, stage]));
  return plannedNames.map((name) => completedByName.get(name) ?? {
    name,
    seconds: 0,
    result: 'skipped',
  });
}
