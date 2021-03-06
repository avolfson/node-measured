/*global describe, it, beforeEach, afterEach*/
const express = require('express');
const Registry = require('measured-reporting').SelfReportingMetricsRegistry;
const TestReporter = require('../unit/TestReporter');
const { createExpressMiddleware } = require('../../lib');
const findFreePort = require('find-free-port');
const assert = require('assert');
const http = require('http');

describe('express-middleware', () => {
  let port;
  let reporter;
  let registry;
  let middleware;
  let app;
  let httpServer;
  beforeEach(() => {
    return new Promise(resolve => {
      reporter = new TestReporter();
      registry = new Registry(reporter);
      middleware = createExpressMiddleware(registry, 1);
      app = express();
      app.use(middleware);
      app.use(express.json());

      app.get('/hello', (req, res) => res.send('Hello World!'));
      app.post('/world', (req, res) => res.status(201).send('Hello World!'));
      app.get('/users/:userId', (req, res) => {
        res.send(`id: ${req.params.userId}`);
      });

      findFreePort(3000).then(portArr => {
        port = portArr.shift();

        httpServer = http.createServer(app);
        httpServer.listen(port);
        resolve();
      });
    });
  });

  afterEach(() => {
    httpServer.close();
    registry.shutdown();
  });

  it('creates a single timer that has 1 count for requests, when an http call is made once', () => {
    return callLocalHost(port, 'hello').then(() => {
      const registeredKeys = registry._registry.allKeys();
      assert(registeredKeys.length === 1);
      assert.equal(registeredKeys[0], 'requests-GET-200-/hello');
      const metricWrapper = registry._registry.getMetricWrapperByKey('requests-GET-200-/hello');
      const name = metricWrapper.name;
      const dimensions = metricWrapper.dimensions;
      assert.equal(name, 'requests');
      assert.deepEqual(dimensions, { statusCode: '200', method: 'GET', uri: '/hello' });
    });
  });

  it('creates a single timer that has 1 count for requests, when an http POST call is made once', () => {
    const options = {method: 'POST', headers: {'Content-Type': 'application/json'}};
    return callLocalHost(port, 'world', options).then(() => {
      const registeredKeys = registry._registry.allKeys();
      assert(registeredKeys.length === 1);
      assert.equal(registeredKeys[0], 'requests-POST-201-/world');
      const metricWrapper = registry._registry.getMetricWrapperByKey('requests-POST-201-/world');
      const name = metricWrapper.name;
      const dimensions = metricWrapper.dimensions;
      assert.equal(name, 'requests');
      assert.deepEqual(dimensions, { statusCode: '201', method: 'POST', uri: '/world' });
    });
  });

  it('does not create runaway n metrics in the registry for n ids in the path', () => {
    return Promise.all([
      callLocalHost(port, 'users/foo'),
      callLocalHost(port, 'users/bar'),
      callLocalHost(port, 'users/bop')
    ]).then(() => {
      assert.equal(registry._registry.allKeys().length, 1, 'There should only be one metric for /users and GET');
    });
  });
});

const callLocalHost = (port, endpoint, options) => {
  return new Promise((resolve, reject) => {
    const req = Object.assign({protocol: `http:`,
                                   host: `127.0.0.1`,
                                   port: `${port}`,
                                   path: `/${endpoint}`,
                                   method: 'GET'},
                                  options || {});
    http
      .request(req, resp => {
        let data = '';
        resp.on('data', chunk => {
          data += chunk;
        });

        resp.on('end', () => {
          console.log(JSON.stringify(data));
          resolve();
        });
      })
      .on('error', err => {
        console.log('Error: ', JSON.stringify(err));
        reject();
      })
    .end();
  });
};
