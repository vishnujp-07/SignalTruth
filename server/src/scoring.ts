export type Metrics = { latencyMs: number; downloadMbps: number; uploadMbps: number; jitterMs: number };
export type Task = 'video' | 'exam' | 'remote' | 'browse' | 'message';
export function scoreTask(m: Metrics, task: Task) {
  const rules: Record<Task, { latency: number; download: number; upload: number; jitter: number; label: string }> = {
    video: { latency: 150, download: 5, upload: 2, jitter: 30, label: 'Video consultation' },
    exam: { latency: 250, download: 2, upload: 1, jitter: 50, label: 'Online examination' },
    remote: { latency: 150, download: 5, upload: 3, jitter: 30, label: 'Remote-work meeting' },
    browse: { latency: 500, download: 1, upload: 0.25, jitter: 100, label: 'General browsing' },
    message: { latency: 500, download: 0.1, upload: 0.1, jitter: 150, label: 'Internet message endpoint' }
  };
  const r = rules[task];
  const parts = [
    { name: 'Latency', value: m.latencyMs, limit: r.latency, good: m.latencyMs <= r.latency },
    { name: 'Download', value: m.downloadMbps, limit: r.download, good: m.downloadMbps >= r.download },
    { name: 'Upload', value: m.uploadMbps, limit: r.upload, good: m.uploadMbps >= r.upload },
    { name: 'Jitter', value: m.jitterMs, limit: r.jitter, good: m.jitterMs <= r.jitter }
  ];
  const points = parts.map(p => p.good ? 25 : Math.max(0, 25 * (p.name === 'Download' || p.name === 'Upload' ? p.value / p.limit : p.limit / Math.max(p.value, 1))));
  const score = Math.round(points.reduce((a, b) => a + Math.min(25, b), 0));
  return { score, taskLabel: r.label, parts, verdict: score >= 80 ? 'Likely suitable' : score >= 55 ? 'Use with caution' : 'Unreliable for this task', explanation: score >= 80 ? 'The measured connection meets most of this task’s baseline thresholds. This is not a guarantee of uninterrupted service.' : 'One or more measurements missed the task’s baseline thresholds. Try again at a different time and compare results.' };
}
