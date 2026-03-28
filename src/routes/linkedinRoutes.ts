import { Router, Request, Response } from 'express';
import https from 'https';
import { config } from '../config';

const router = Router();

/**
 * POST /api/linkedin/run
 * Proxies a TinyFish SSE automation run to keep the API key server-side.
 * Streams SSE events directly back to the client.
 */
router.post('/run', (req: Request, res: Response) => {
  const { goal, url, browser_profile, use_vault } = req.body;

  if (!goal) {
    res.status(400).json({ error: 'goal is required' });
    return;
  }

  const apiKey = config.tinyfish.apiKey;
  if (!apiKey) {
    res.status(500).json({ error: 'TinyFish API key not configured' });
    return;
  }

  const payload = JSON.stringify({
    url: url || 'https://www.linkedin.com/jobs/search',
    goal,
    browser_profile: browser_profile || 'stealth',
    use_vault: use_vault !== undefined ? use_vault : true,
  });

  // Set up SSE headers so the browser client can consume the stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const tinyFishUrl = new URL('/v1/automation/run-sse', 'https://agent.tinyfish.ai');
  const options = {
    hostname: tinyFishUrl.hostname,
    port: 443,
    path: tinyFishUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'X-API-Key': apiKey,
    },
  };

  const upstreamReq = https.request(options, (upstreamRes) => {
    upstreamRes.on('data', (chunk: Buffer) => {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    });

    upstreamRes.on('end', () => {
      if (!res.writableEnded) {
        res.end();
      }
    });

    upstreamRes.on('error', (err) => {
      console.error('Upstream SSE error:', err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'ERROR', error: err.message })}\n\n`);
        res.end();
      }
    });
  });

  upstreamReq.on('error', (err) => {
    console.error('TinyFish request error:', err);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'ERROR', error: err.message })}\n\n`);
      res.end();
    }
  });

  // Forward client disconnect
  req.on('close', () => {
    upstreamReq.destroy();
  });

  upstreamReq.write(payload);
  upstreamReq.end();
});

export default router;
