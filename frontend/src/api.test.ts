import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInspiration4Glucose, fetchSeries } from './api';

function mockSeries(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchSeries', () => {
  it('pads a short series with nulls instead of shifting the days', async () => {
    mockSeries({
      crew_id: 'c1',
      baseline_end_day: 14,
      days: [1, 2, 3],
      series: { sleep_h: [6.8, 6.5], hr_rest: [61, 63, 64] },
      baseline: {
        sleep_h: { median: 7, mad: 0.35 },
        hr_rest: { median: 62, mad: 2 },
      },
    });

    const dataset = await fetchSeries('c1', 3);

    expect(dataset.values.sleep_h).toEqual([6.8, 6.5, null]);
    expect(dataset.values.hr_rest).toEqual([61, 63, 64]);
    expect(dataset.baseline.sleep_h).toEqual({ median: 7, mad: 0.35 });
  });

  it('rejects a series that does not end on the requested day', async () => {
    mockSeries({
      crew_id: 'c1',
      baseline_end_day: 14,
      days: [1, 2, 4],
      series: {},
      baseline: {},
    });

    await expect(fetchSeries('c1', 3)).rejects.toThrow(/no termina en ese día/);
  });
});

describe('fetchInspiration4Glucose', () => {
  it('maps the real OSDR payload to camelCase without changing values', async () => {
    mockSeries({
      study: 'OSD-575',
      title: 'SpaceX Inspiration4 Blood Serum Metabolic Panel',
      source_url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575',
      license: 'NASA OSDR',
      indicator: 'glucose_mgdl',
      unit: 'mg/dL',
      note: 'real',
      preflight_median: 83,
      points: [
        {
          crew_id: 'C001',
          timepoint: 'L-3',
          day: -3,
          value: 69,
          range_min: 65,
          range_max: 99,
        },
      ],
    });

    const data = await fetchInspiration4Glucose();

    expect(data.study).toBe('OSD-575');
    expect(data.points).toEqual([
      { crewId: 'C001', timepoint: 'L-3', day: -3, value: 69, rangeMin: 65, rangeMax: 99 },
    ]);
    expect(data.preflightMedian).toBe(83);
  });
});
