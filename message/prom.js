var Register = require('prom-client').register;  
var Counter = require('prom-client').Counter;  
var Histogram = require('prom-client').Histogram;  
var Summary = require('prom-client').Summary;  
var ResponseTime = require('response-time');  
var logger = require('./winston');

 module.exports.httpRequestDurationMicroseconds = requestDurationMs = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in mics',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.10, 5, 15, 50, 100, 200, 300, 400, 500]
  })

 module.exports.numRequests = numRequests = new Counter({  
    name: 'numRequests',
    help: 'Number of requests',
    labelNames: ['method']
});

 module.exports.pathsTaken = pathsTaken = new Counter({  
    name: 'pathsTaken',
    help: 'Paths taken',
    labelNames: ['path']
});

 module.exports.responses = responses = new Summary({  
    name: 'responses',
    help: 'Response time ms',
    labelNames: ['method', 'path', 'status']
});

 module.exports.startCollection = function () {  
    logger.info(`Metrics on /metrics`);
    require('prom-client').collectDefaultMetrics();
};

 module.exports.requestCounters = function (req, res, next) {  
    if (req.path != '/metrics') {
        numRequests.inc({ method: req.method });
        pathsTaken.inc({ path: req.path });
    }
    next();
};

 module.exports.responseCounters = ResponseTime(function (req, res, time) {  
    const responseTimeInMs = Date.now() - res.locals.startEpoch
    if(req.url != '/metrics') {
        requestDurationMs.labels(req.method, req.route, res.statusCode).observe(responseTimeInMs)
        responses.labels(req.method, req.url, res.statusCode).observe(time);
    }
 });

 module.exports.injectMetricsRoute = function (app) { 
     app.get('/metrics', (req, res) => {
        res.set('Content-Type', Register.contentType);
        res.end(Register.metrics());
    });
    
}; 