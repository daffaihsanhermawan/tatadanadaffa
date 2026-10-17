/**
 * TataDana Production Tunnelmole Daemon Runner
 * Provides a stable, universal HTTPS public tunnel on Port 443 with resilient auto-reconnect.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const net = require('net');

const LOCAL_PORT = 3000;
const URL_FILE = path.join(__dirname, '..', 'public-tunnel-url.txt');
const HEARTBEAT_INTERVAL_MS = 60000; // 60s
const RECONNECT_DELAY_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 10;

let activeUrl = null;
let heartbeatTimer = null;
let consecutiveFailures = 0;
let isReconnecting = false;

function checkLocalPort(port, host = '127.0.0.1', timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function pingPublicUrl(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = https.get({
        hostname: parsedUrl.hostname,
        port: 443,
        path: '/',
        method: 'HEAD',
        headers: {
          'User-Agent': 'TataDana-Tunnel-Heartbeat/1.0',
          'Connection': 'close'
        },
        timeout: timeoutMs
      }, (res) => {
        res.resume();
        resolve(res.statusCode < 500);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.on('error', () => {
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function startHeartbeat(url) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  consecutiveFailures = 0;
  heartbeatTimer = setInterval(async () => {
    if (!activeUrl || isReconnecting) return;

    const isHealthy = await pingPublicUrl(url);
    const timestamp = new Date().toLocaleTimeString();

    if (isHealthy) {
      consecutiveFailures = 0;
      console.log(`[${timestamp}] 💓 Heartbeat: Tunnel operational (${url})`);
    } else {
      consecutiveFailures++;
      console.warn(`[${timestamp}] ⚠️ Heartbeat warning: Tunnel ping missed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`[${timestamp}] ❌ Heartbeat failed ${MAX_CONSECUTIVE_FAILURES} consecutive times. Reconnecting tunnel...`);
        triggerReconnect('Watchdog detected 10 consecutive missed pings');
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

async function triggerReconnect(reason = 'Unknown') {
  if (isReconnecting) return;
  isReconnecting = true;

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  console.log(`\n🔄 Reconnection triggered: [${reason}]. Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
  setTimeout(async () => {
    await startDaemon();
  }, RECONNECT_DELAY_MS);
}

async function startDaemon() {
  console.log('====================================================');
  console.log(`🌐 TataDana Production Tunnelmole Daemon for Port ${LOCAL_PORT}...`);
  console.log('🔒 Protocol: HTTPS (Port 443 Standard - Universal Access)');
  console.log('====================================================');

  try {
    const isPortOpen = await checkLocalPort(LOCAL_PORT);
    if (!isPortOpen) {
      console.warn(`⏳ Port ${LOCAL_PORT} is not ready yet (waiting for Next.js). Retrying in 3s...`);
      setTimeout(startDaemon, 3000);
      return;
    }

    const tmModule = await import('tunnelmole');
    const tunnelmole = tmModule.tunnelmole || tmModule.default;

    if (typeof tunnelmole !== 'function') {
      throw new Error('Failed to resolve tunnelmole function from module');
    }

    const url = await tunnelmole({ port: LOCAL_PORT });

    if (url && typeof url === 'string') {
      activeUrl = url.trim();
      isReconnecting = false;
      consecutiveFailures = 0;

      console.log('\n🚀 ====================================================');
      console.log(`✨ UNIVERSAL PUBLIC HTTPS URL: ${activeUrl}`);
      console.log('✅ Port: 443 (Standard HTTPS - Accessible on all networks)');
      console.log('✅ Mobile Networks (Telkomsel/Indosat/XL/Tri): Supported');
      console.log('✅ No Password Warning Page: Direct Access');
      console.log('====================================================\n');

      try {
        fs.writeFileSync(URL_FILE, activeUrl, 'utf8');
        console.log(`💾 Active URL saved to ${path.basename(URL_FILE)}`);
      } catch (fileErr) {
        console.error('⚠️ Could not write URL file:', fileErr.message);
      }

      startHeartbeat(activeUrl);
    } else {
      throw new Error('Tunnelmole did not return a valid URL');
    }
  } catch (err) {
    console.error('❌ Tunnelmole error:', err.message || err);
    triggerReconnect(err.message || 'Startup failure');
  }
}

setInterval(() => {}, 60000);

process.on('SIGINT', () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  process.exit(0);
});

startDaemon();
