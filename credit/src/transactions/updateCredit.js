const database = require("../database");
const Credit = require("../models/credit");
const { cleanClone } = require("../utils");
const logger = require('../../winston')

function updateCredit(creditModel, conditions, newValue) {
  return creditModel.findOneAndUpdate(conditions, newValue, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });
}

function updateCreditTransaction(conditions, newValue) {
  const CreditPrimary = Credit();
  const CreditReplica = Credit("replica");

  let oldValue;

  return Promise.resolve(CreditPrimary.findOne(conditions))
    .then(doc => {
      oldValue = doc;
    })
    .then(() => {
      return updateCredit(CreditPrimary, conditions, newValue).then(doc => {
        logger.info(`Credit updated successfully ${doc.amount}`);
        return doc;
      });
    })
    .then(cleanClone)
    .then(replica => {
      return updateCredit(CreditReplica, conditions, replica).then(doc => {
        logger.info(`Credit replicated successfully ${doc.amount}`);
        return doc;
      });
    })
    .then(doc => {
      if (doc == null) {
        throw `Credit transaction couldn't be replicated`;
      }
      return doc;
    })
    .catch(err => {
      logger.error(`Error saving credit transaction: ${err}`);
      if (oldValue) {
        oldValue.markModified("amount");
        oldValue.save().then(() => {
          throw err;
        });
      } else {
        throw err;
      }
    });
}

module.exports = function(conditions, newValue, cb) {
  if (database.isReplicaOn()) {
    updateCreditTransaction(conditions, newValue)
      .then(doc => cb(doc))
      .catch(err => {
        cb(undefined, err);
      });
  } else {
    updateCredit(Credit(), conditions, newValue)
      .then(doc => {
        logger.info(`Credit updated successfully ${doc}`);
        cb(doc);
      })
      .catch(err => {
        cb(undefined, err);
      });
  }
};
