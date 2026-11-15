import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSeries } from './api';

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
