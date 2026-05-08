export function calcElevationGain(elevations: number[]): number {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}

// Days a stage takes, based on 8-hour hiking day.
export function stageDays(durationMinutes?: number): number {
  if (!durationMinutes || durationMinutes <= 0) return 1;
  return Math.ceil(durationMinutes / 480);
}

// Cumulative day-start offset for each stage (0-based).
export function buildDayOffsets(durationMinutesPerStage: (number | undefined)[]): number[] {
  const offsets: number[] = [];
  let offset = 0;
  for (const d of durationMinutesPerStage) {
    offsets.push(offset);
    offset += stageDays(d);
  }
  return offsets;
}

// Total trip days across all stages.
export function totalTripDays(durationMinutesPerStage: (number | undefined)[]): number {
  return durationMinutesPerStage.reduce<number>((s, d) => s + stageDays(d), 0);
}
