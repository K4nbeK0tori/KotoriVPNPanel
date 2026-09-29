const https = require('https');

function probe(host, path, label) {
  return new Promise((resolve) => {
    const req = https.request(
      { host, port: 443, path, rejectUnauthorized: false, timeout: 15000 },
      (res) => {
        const sock = res.socket;
        const cert = sock.getPeerCertificate();
        console.log(`--- ${label} (${host}) ---`);
        console.log('  STATUS      :', res.statusCode);
        console.log('  HTTP_VER    :', res.httpVersion);
        console.log('  CERT_SAN    :', cert && cert.subjectaltname);
        console.log('  CERT_EXPIRES:', cert && cert.valid_to);
        console.log('  SERVER_HDR  :', res.headers.server || '-');
        let n = 0;
        res.on('data', (c) => (n += c.length));
        res.on('end', () => {
          console.log('  BYTES       :', n);
          resolve();
        });
      }
    );
    req.on('timeout', () => { console.log(`--- ${label} --- TIMEOUT`); req.destroy(); resolve(); });
    req.on('error', (e) => { console.log(`--- ${label} (${host}) ---`); console.log('  ERR:', e.message); resolve(); });
    req.end();
  });
}

(async () => {
  console.log('=== 外部可达性探测 (从本机) ===\n');
  await probe('panel.kanbekotori.top', '/', 'PANEL');
  await probe('prompts.kanbekotori.top', '/', 'PROMPTS');
})();
