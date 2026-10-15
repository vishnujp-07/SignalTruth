import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { scoreTask, type Task } from './scoring.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const dataDir = path.resolve('server/data');
const measurementsPath = path.join(dataDir, 'measurements.json');
const reportsPath = path.join(dataDir, 'reports.json');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '30kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false }));

const demoAreas = [
  { id:'central', name:'Central District', lat:12.9716, lng:77.5946, score:91, samples:42, latency:38, download:48.2, upload:12.1, jitter:7, loss:null, confidence:'High', source:'DEMO DATA', note:'Illustrative sample only' },
  { id:'north', name:'North Quarter', lat:13.0358, lng:77.5970, score:72, samples:18, latency:91, download:14.6, upload:4.8, jitter:21, loss:null, confidence:'Medium', source:'DEMO DATA', note:'Illustrative sample only' },
  { id:'east', name:'East Tech Park', lat:12.9850, lng:77.6650, score:84, samples:26, latency:52, download:31.4, upload:8.3, jitter:12, loss:null, confidence:'Medium', source:'DEMO DATA', note:'Illustrative sample only' },
  { id:'south', name:'South Residential', lat:12.9081, lng:77.6000, score:47, samples:7, latency:188, download:3.2, upload:0.7, jitter:64, loss:null, confidence:'Low', source:'DEMO DATA', note:'Illustrative sample only' },
  { id:'west', name:'West Market', lat:12.9660, lng:77.5450, score:59, samples:11, latency:132, download:7.9, upload:1.9, jitter:39, loss:null, confidence:'Low', source:'DEMO DATA', note:'Illustrative sample only' },
  { id:'lake', name:'Lake View', lat:12.9352, lng:77.6100, score:18, samples:0, latency:null, download:null, upload:null, jitter:null, loss:null, confidence:'Insufficient', source:'NO DATA', note:'No observations — do not infer quality' }
];
async function readArray(file: string): Promise<any[]> { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return []; } }
async function saveArray(file: string, items: any[]) { await mkdir(dataDir, { recursive: true }); await writeFile(file, JSON.stringify(items, null, 2)); }
const measurementSchema = z.object({ task: z.enum(['video','exam','remote','browse','message']), latencyMs: z.number().min(0).max(60000), downloadMbps: z.number().min(0).max(10000), uploadMbps: z.number().min(0).max(10000), jitterMs: z.number().min(0).max(60000), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), share: z.boolean().default(false) });
const reportSchema = z.object({ area: z.string().trim().min(2).max(80), task: z.enum(['video','exam','remote','browse','message']), networkType: z.enum(['Wi-Fi','Mobile data','Unknown']), experience: z.enum(['good','mixed','poor']), note: z.string().trim().max(240).default('') });
app.get('/api/health', (_req,res) => res.json({ ok:true, service:'SignalTruth API', persistence:'local-json', time:new Date().toISOString() }));
app.get('/api/config', (_req,res) => res.json({ mode:'demo-plus-live-tests', persistence:'local-json', supabaseConfigured:Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY), demoLabel:'DEMO DATA' }));
app.get('/api/areas', (_req,res) => res.json(demoAreas));
app.get('/api/areas/:id', (req,res) => { const area=demoAreas.find(a=>a.id===req.params.id); if(!area) return res.status(404).json({error:'Area not found'}); return res.json(area); });
app.get('/api/measurements', async (req,res) => { const items=await readArray(measurementsPath); const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50)); res.json({items:items.slice(-limit).reverse(),total:items.length}); });
app.post('/api/measurements', async (req,res) => { const parsed=measurementSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'Invalid measurement',details:parsed.error.flatten()}); const m=parsed.data; const result=scoreTask(m,m.task as Task); const item={id:randomUUID(),...m, latitude:m.share?m.latitude:undefined, longitude:m.share?m.longitude:undefined, timestamp:new Date().toISOString(), source:'LIVE_BROWSER_TEST', score:result.score, verdict:result.verdict}; const items=await readArray(measurementsPath); items.push(item); await saveArray(measurementsPath,items); return res.status(201).json({saved:true,item,assessment:result}); });
app.get('/api/analytics/summary', async (_req,res) => { const items=await readArray(measurementsPath); res.json({totalMeasurements:items.length,areasWithData:demoAreas.filter(a=>a.samples>0).length,highReliability:demoAreas.filter(a=>a.samples>0&&a.score>=80).length,lowReliability:demoAreas.filter(a=>a.samples>0&&a.score<60).length,liveTests:items.length,demoAreas:demoAreas.length}); });
app.get('/api/analytics/by-time', async (_req,res) => { const items=await readArray(measurementsPath); const buckets=['Morning','Afternoon','Evening','Night']; res.json(buckets.map((label,i)=>({label,tests:items.filter(x=>{const h=new Date(x.timestamp).getHours(); return i===0?h>=5&&h<12:i===1?h>=12&&h<17:i===2?h>=17&&h<22:h>=22||h<5;}).length}))); });
app.post('/api/reports', async (req,res) => { const parsed=reportSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'Please check the report fields',details:parsed.error.flatten()}); const items=await readArray(reportsPath); const report={id:randomUUID(),...parsed.data,createdAt:new Date().toISOString(),source:'COMMUNITY REPORT'}; items.push(report); await saveArray(reportsPath,items); return res.status(201).json({saved:true,report}); });
app.get('/api/reports', async (_req,res) => res.json((await readArray(reportsPath)).slice(-100).reverse()));
app.get('/api/test/download', (req,res) => { const size=Math.min(2_000_000,Math.max(50_000,Number(req.query.bytes)||500_000)); res.setHeader('Content-Type','application/octet-stream'); res.setHeader('Cache-Control','no-store, no-cache, must-revalidate'); res.setHeader('Content-Length',String(size)); res.end(Buffer.alloc(size, 97)); });
app.post('/api/test/upload', (req,res) => { const bytes=Buffer.byteLength(JSON.stringify(req.body||{})); res.setHeader('Cache-Control','no-store'); res.json({receivedBytes:bytes,receivedAt:Date.now()}); });
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction) => { console.error(err); res.status(500).json({error:'Unexpected server error'}); });
app.listen(port, () => console.log(`SignalTruth API running at http://localhost:${port}`));
