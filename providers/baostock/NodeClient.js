const thrift = require('thrift');
const assert = require('assert');
const StkService = require('./gen-nodejs/StkService');
// const ttypes = require('./gen-nodejs/stkline_types');

const transport = thrift.TBufferedTransport;
const protocol = thrift.TBinaryProtocol;

const connection = thrift.createConnection('localhost', 9090, {
  transport,
  protocol,
});

connection.on('error', (err) => {
  assert(false, err);
});

// Create a Calculator client with the connection
const thriftClient = thrift.createClient(StkService, connection);

thriftClient.getStockline('SZ.000401', '2021-07-28', '2021-08-04', (err, response) => {
  console.log(err);
  console.log(response);
});

module.exports = { thriftClient };
