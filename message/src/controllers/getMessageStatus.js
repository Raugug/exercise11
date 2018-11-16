const getMessageStatus = require("../clients/getMessageStatus");
const logger = require('../../winston')

module.exports = function(req, res) {
  getMessageStatus(req.params.messageId).then(status => {
    res.status(200).send(status)
    .catch(err => logger.error(`Error getting status ${err}`));
  });
};
