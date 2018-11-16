const database = require("../database");
const Message = require("../models/message");
const { cleanClone } = require("../utils");
const logger = require('../../winston');

const _ = require("lodash");

function saveMessageReplica(replica, retries) {
  if (retries > 0) {
    replica.markModified("body");
    return replica
      .save()
      .then(doc => {
        logger.info(`Message replicated successfully`);
        return doc;
      })
      .catch(err => {
        logger.error(`Error while saving message replica`);
        logger.warn("Retrying...");
        return saveMessageReplica(replica, retries - 1);
      });
  }
}

function saveMessageTransaction(newValue) {
  const MessagePrimary = Message();
  const MessageReplica = Message("replica");

  let message = new MessagePrimary(newValue);
  const { messageId, status } = newValue;

  return MessagePrimary.findOneAndUpdate({"messageId": messageId}, {status}, {new:true})
    .then(doc => {
      if (doc != null) {
        MessageReplica.findOneAndUpdate({messageId}, {status}, {new:true})
        .then(doc => logger.info(`Message updated successfully`))
        } else {
          message.save()
          .then(doc => {
            logger.info(`Message saved successfully`);
            return cleanClone(doc);
          })
          .then(clone => {
            let replica = new MessageReplica(newValue);
            saveMessageReplica(replica, 3);
            return clone;
          })
          .catch(err => {
            logger.error(`Error while saving message`);
            throw err;
          });
        }
    })
    
}

module.exports = function(messageParams, cb) {
  saveMessageTransaction(messageParams)
    .then(() => cb())
    .catch(err => {
      cb(undefined, err);
    });
};
