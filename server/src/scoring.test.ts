import { describe, it, expect } from 'vitest';
import { scoreTask } from './scoring';

describe('scoreTask', () => {
  it('scores a strong connection highly for video consultation', () => {
    const result = scoreTask({latencyMs:35,downloadMbps:40,uploadMbps:10,jitterMs:5},'video');
    expect(result.score).toBe(100);
    expect(result.verdict).toBe('Likely suitable');
  });
  it('penalizes poor throughput and instability', () => {
    const result = scoreTask({latencyMs:900,downloadMbps:0.2,uploadMbps:0.05,jitterMs:250},'video');
    expect(result.score).toBeLessThan(55);
    expect(result.parts.some(p=>!p.good)).toBe(true);
  });
  it('identifies the selected task in its explanation', () => {
    expect(scoreTask({latencyMs:30,downloadMbps:10,uploadMbps:3,jitterMs:5},'exam').taskLabel).toBe('Online examination');
  });
});
