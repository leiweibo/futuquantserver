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
const client = thrift.createClient(StkService, connection);

client.getStockline('SH.600000', '2021-07-01', '2021-07-05', (err, response) => {
  console.log(err);
  console.log(response);
});
