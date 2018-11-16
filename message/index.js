const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const {
  Validator,
  ValidationError
} = require("express-json-validator-middleware");
const getMessages = require("./src/controllers/getMessages");
const getMessageStatus = require("./src/controllers/getMessageStatus");
const checkHealth = require('./src/controllers/checkHealth');
const { checkCredit } = require("./src/queue/queue");
const logger = require('./winston');
//const Prometheus = require('prom-client')
const Prometheus = require('./prom'); 
require('prom-client').collectDefaultMetrics()
//const metrics = require("./controllers/metrics");


const app = express();
//const port = process.env.PORT;
const port = 9010;

const validator = new Validator({ allErrors: true });
const { validate } = validator;

const messageSchema = {
  type: "object",
  required: ["destination", "body"],
  properties: {
    destination: {
      type: "string"
    },
    body: {
      type: "string"
    },
    location: {
      name: {
        type: "string"
      },
      cost: {
        type: "number"
      }
    }
  }
};

app.post(
  "/messages",
  bodyParser.json(),
  validate({ body: messageSchema }),
  checkCredit
);

app.get("/messages", getMessages);
app.get("/message/:messageId/status", getMessageStatus);
app.get('/health', checkHealth);
/* app.get('/metrics', (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType)
  res.end(Prometheus.register.metrics())
}) */

app.use(Prometheus.requestCounters);  
app.use(Prometheus.responseCounters);

Prometheus.injectMetricsRoute(app);
Prometheus.startCollection();


app.use(function(err, req, res, next) {
  if (err instanceof ValidationError) {
    res.sendStatus(400);
  } else {
    res.sendStatus(500);
  }
});

app.listen(port, function() {
  logger.info(`App message started on PORT ${port}`);
});
