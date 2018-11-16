const mongoose = require("mongoose");
const logger = require('../winston');
mongoose.set('useFindAndModify', false);

const servers = {
  primary: "exercise11_mongodb_message_1:27027",
  replica: "exercise11_replica_message_1:27028"
  //primary: "127.0.0.1:27027",
  //replica: "127.0.0.1:27028"
};
const database = "cabify_bootcamp";

function createConnection(name, server, database) {
  return {
    name,
    isPrimary: false,
    isActive: true,
    conn: mongoose.createConnection(`mongodb://${server}/${database}`, {
      useNewUrlParser: true,
      autoReconnect: true
    })
  };
}

function setupConnection(connection, backup) {
  connection.conn.on("disconnected", () => {
    logger.warn(`Node down: ${connection.name}`);
    connection.isActive = false;
    if (connection.isPrimary) {
      connection.isPrimary = false;
      backup.isPrimary = backup.isActive;
    }
  });
  connection.conn.on("reconnected", () => {
    logger.info(`Node up: ${connection.name}`);
    connection.isActive = true;
    connection.isPrimary = !backup.isPrimary;
  });
}

const connections = [
  createConnection("PRIMARY", servers.primary, database),
  createConnection("REPLICA", servers.replica, database)
];

connections[0].isPrimary = true;
setupConnection(connections[0], connections[1]);
setupConnection(connections[1], connections[0]);

module.exports = {
  get: function(dbKey) {
    let conn;
    if (dbKey == undefined || dbKey == "primary") {
      conn = connections.find(connection => connection.isPrimary == true);
    } else if (dbKey == "replica") {
      conn = connections.find(connection => connection.isPrimary == false);
    }
    if (conn) {
      logger.info(`Requested connection: ${dbKey}`);
      logger.info(`Found: ${conn.name}`);
    }
    debugger;
    return conn.conn;
  },

  isReplicaOn: function() {
    replicaOn = connections[0].isActive && connections[1].isActive;
    logger.warn(`Replica is ${replicaOn ? "ON" : "OFF"}`);
    return replicaOn;
  }
};
