// utils/keepAlive.js
// Pings your own /api/health endpoint every 10 minutes between 05:00–17:00 IST.
// At night (17:00–05:00 IST) it DOES NOT ping, so app can spin down.

import cron from 'node-cron';

const isWithinDayWindowIST = () => {
  // Convert current UTC time to IST (UTC+5:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);

  const hour = ist.getHours(); // 0-23 in IST
  // Day window: 05:00 to 16:59:59 inclusive (i.e., hour 5..16). We also accept 17:00 end boundary as off.
  return hour >= 5 && hour < 17;
};

const ping = async () => {
  const url = process.env.KEEP_ALIVE_URL || `${process.env.PUBLIC_BASE_URL || ''}/api/health`;
  if (!url) return; // no URL configured

  if (!isWithinDayWindowIST()) return; // night: do not ping

  try {
    // Node 18+ has fetch built-in
    await fetch(url, { method: 'GET', headers: { 'User-Agent': 'keepalive-cron' } });
    // no console spam
  } catch {
    // ignore failures silently
  }
};

// Every 10 minutes
cron.schedule('*/10 * * * *', ping, { timezone: 'Asia/Kolkata' });

export default {};
