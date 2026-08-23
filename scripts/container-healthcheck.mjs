import http from 'node:http';

const TIMEOUT_MS = 8_000;

function probe({ host, port, path, headers = {} }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    const req = http.request({ host, port, path, headers, method: 'GET' }, (res) => {
      clearTimeout(timer);
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

async function main() {
  if (!process.env.PUBLIC_SITE_HOST) {
    process.stderr.write('healthcheck failed\n');
    process.exit(1);
  }

  const targets = [
    { host: '127.0.0.1', port: 3001, path: '/api/health', requireJson: true, publicCheck: true },
    { host: '127.0.0.1', port: 4001, path: '/api/health', requireJson: true },
    { host: '127.0.0.1', port: 3005, path: '/dashboard/login', requireJson: false, adminCheck: true },
  ];

  for (const target of targets) {
    const headers = {};
    if (target.publicCheck) {
      headers['Host'] = process.env.PUBLIC_SITE_HOST;
    }
    if (target.adminCheck) {
      if (!process.env.ADMIN_HOST) {
        process.stderr.write('healthcheck failed\n');
        process.exit(1);
      }
      headers['Host'] = process.env.ADMIN_HOST;
    }

    const result = await probe({ host: target.host, port: target.port, path: target.path, headers });

    if (target.adminCheck) {
      if (result.status !== 200) {
        throw new Error(`admin probe returned ${result.status}`);
      }
    } else {
      if (result.status !== 200) {
        throw new Error(`probe ${target.host}:${target.port}${target.path} returned ${result.status}`);
      }
      let parsed;
      try { parsed = JSON.parse(result.body); } catch {
        throw new Error('response is not JSON');
      }
      if (parsed.ok !== true) {
        throw new Error('response ok !== true');
      }
    }
  }
}

main().then(() => {
  process.exit(0);
}).catch(() => {
  process.stderr.write('healthcheck failed\n');
  process.exit(1);
});