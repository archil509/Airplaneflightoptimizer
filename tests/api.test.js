import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createApp } from '../server/index.js';

function requestJson(server, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: urlPath,
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: raw ? JSON.parse(raw) : null,
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('Express REST API end-to-end endpoints', async () => {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const health = await requestJson(server, 'GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');
    assert.ok(health.body.datasets.global.airportCount >= 80);

    const network = await requestJson(server, 'GET', '/api/network?dataset=academic');
    assert.equal(network.status, 200);
    assert.equal(network.body.airports.length, 4);

    const vizNetwork = await requestJson(server, 'GET', '/api/network?dataset=visualizer');
    assert.equal(vizNetwork.status, 200);
    assert.equal(vizNetwork.body.airports.length, 18);

    const compare = await requestJson(server, 'POST', '/api/compare', {
      dataset: 'global',
      source: 'JFK',
      target: 'LAX',
      objective: 'distance',
    });
    assert.equal(compare.status, 200);
    assert.equal(compare.body.comparison.sameOptimalCost, true);
    assert.ok(compare.body.astar.visitedCount <= compare.body.dijkstra.visitedCount);

    const haversine = await requestJson(server, 'GET', '/api/haversine?from=JFK&to=LAX');
    assert.equal(haversine.status, 200);
    assert.ok(haversine.body.distanceKm > 3900);

    const bench = await requestJson(server, 'POST', '/api/benchmark', {
      dataset: 'global',
      iterations: 5,
    });
    assert.equal(bench.status, 200);
    assert.ok(bench.body.results.length >= 4);

    const badOptimize = await requestJson(server, 'POST', '/api/optimize', {
      source: 'JFK',
    });
    assert.equal(badOptimize.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
