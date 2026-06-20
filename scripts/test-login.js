'use strict';

setTimeout(function() {
  const http = require('http');
  const body = JSON.stringify({ username: 'admin', password: 'admin123' });
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, function(res) {
    var d = '';
    res.on('data', function(c) { d += c; });
    res.on('end', function() {
      console.log('STATUS: ' + res.statusCode);
      console.log('BODY: ' + d);
      process.exit(0);
    });
  });
  req.on('error', function(e) {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  });
  req.write(body);
  req.end();
}, 3000);
