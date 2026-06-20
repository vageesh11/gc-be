'use strict';

var http = require('http');

function testLogin(username, password, cb) {
  var body = JSON.stringify({ username: username, password: password });
  var req = http.request({
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
    res.on('end', function() { cb(res.statusCode, d); });
  });
  req.on('error', function(e) { cb(0, e.message); });
  req.write(body);
  req.end();
}

setTimeout(function() {
  testLogin('admin', 'tzN*aAwWLV8d8#UW', function(status, body) {
    console.log('admin/tzN*...     -> HTTP ' + status + (status === 200 ? ' OK' : ' FAIL: ' + body));
  });
  testLogin('operator', 'operator123', function(status, body) {
    console.log('operator/op123   -> HTTP ' + status + (status === 200 ? ' OK' : ' FAIL: ' + body));
  });
  testLogin('admin', 'wrongpass', function(status, body) {
    console.log('admin/wrongpass  -> HTTP ' + status + (status === 401 ? ' OK (correctly rejected)' : ' UNEXPECTED: ' + body));
  });
  setTimeout(function() { process.exit(0); }, 3000);
}, 1000);
