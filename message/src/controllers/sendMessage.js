const http = require("http");
const saveMessage = require("../clients/saveMessage");
const circuitBraker = require('../circuitBraker/braker');
const util = require("util");
const logger = require('../../winston')

//Check state on snapshot stats object
/* circuitBraker.on("snapshot", snapshot => {
	logger.warn(`-- OPEN -- ${util.inspect(snapshot.open)}`);
}); */
  
  module.exports = function (messgBody) {

	const message = messgBody.message;
		delete message['status'];
		const body = JSON.stringify(message);
		
		const postOptions = {
			host: "messageapp",
			//host: "localhost",
			port: 3000,
			path: "/message",
			method: "post",
			json: true,
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(body)
			}
		}
	  
	const circuitFunction = (postOptions) => {

		return new Promise((resolve, reject) => {
			let postReq = http.request(postOptions, (res) => {
				
				if (res.statusCode === 200) {
					logger.info({ ...message })
					saveMessage(
						{
							...message,
							status: "OK"
						},
						function (_result, error) {
							if (error) {
								logger.error(`Error 500: Internal error ${error}`);
							} else {
								logger.info(`Successfully saved with status OK`);
							}
						}
					);
					return resolve(message);
				} else {
					logger.error("Error while sending message 1");

					saveMessage(
						{
							...message,
							status: "ERROR"
						},
						() => {
							logger.error(`Error 500: Internal server error: SERVICE ERROR 1`);
						}
					);
					return reject(new Error(`Error while sending message`))
				}
			});

			postReq.setTimeout(1000);

			postReq.on("timeout", () => {
				logger.error(`Timeout Exceeded`);
				saveMessage(
					{
						...message,
						status: "TIMEOUT"
					},
					() => {
						logger.error(`Error 500: Internal server error: TIMEOUT`);
					}
				);
				return reject(new Error('Error TIMEOUT'))
			});

			postReq.on("error", () => {
				logger.error("Error while sending message 2");

				saveMessage(
					{
						...message,
						status: "ERROR"
					},
					() => {
						logger.error(`Error 500: Internal server error: SERVICE ERROR 2`);
					}
				);
				return reject(new Error(`Error while sending message`));
			});

			postReq.write(body);
			postReq.end();
		})
	}

	const circuit = circuitBraker.slaveCircuit(circuitFunction)
	circuit.exec(postOptions)
		.then(result => {
			logger.info(`result: ${result}`);
		})
		.catch(error => {
			logger.error(`${error}`);
		});
};