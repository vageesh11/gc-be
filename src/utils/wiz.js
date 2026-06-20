'use strict';

/**
 * WiZ Smart Plug controller — UDP local network control.
 * No cloud API, no npm dependency — uses Node built-in `dgram`.
 *
 * WiZ plugs listen on UDP port 38899.
 * Command: { "method": "setPilot", "params": { "state": true|false } }
 *
 * Usage:
 *   const wiz = require('./wiz');
 *   await wiz.turnOn('192.168.1.101');
 *   await wiz.turnOff('192.168.1.101');
 */

const dgram = require('dgram');

const WIZ_PORT    = 38899;
const SEND_TIMEOUT = 3000; // ms — give up if plug doesn't respond

/**
 * Send a setPilot UDP packet to a WiZ plug.
 * @param {string} ip    - IP address of the plug on the local network
 * @param {boolean} state - true = ON, false = OFF
 */
function setPilot(ip, state) {
  return new Promise((resolve) => {
    if (!ip) return resolve();

    const socket = dgram.createSocket('udp4');
    let settled  = false;

    function done() {
      if (settled) return;
      settled = true;
      try { socket.close(); } catch (_) {}
      resolve();
    }

    const msg = Buffer.from(JSON.stringify({
      method: 'setPilot',
      params: { state },
    }));

    const timer = setTimeout(done, SEND_TIMEOUT);

    socket.on('error', (err) => {
      console.warn(`[WiZ] UDP error for ${ip}:`, err.message);
      clearTimeout(timer);
      done();
    });

    socket.send(msg, 0, msg.length, WIZ_PORT, ip, (err) => {
      clearTimeout(timer);
      if (err) console.warn(`[WiZ] Send error for ${ip}:`, err.message);
      else     console.log(`[WiZ] ${state ? 'ON' : 'OFF'} → ${ip}`);
      done();
    });
  });
}

/**
 * Turn a WiZ plug ON. Silently skips if ip is null/undefined.
 */
async function turnOn(ip) {
  if (!ip) return;
  await setPilot(ip, true);
}

/**
 * Turn a WiZ plug OFF. Silently skips if ip is null/undefined.
 */
async function turnOff(ip) {
  if (!ip) return;
  await setPilot(ip, false);
}

module.exports = { turnOn, turnOff };
