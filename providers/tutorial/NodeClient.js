/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const thrift = require('thrift');
const assert = require('assert');
const Calculator = require('../helloworld/gen-nodejs/Calculator');
const ttypes = require('../helloworld/gen-nodejs/tutorial_types');

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
const client = thrift.createClient(Calculator, connection);

client.ping((err, response) => {
  console.log(err);
  console.log(response);
  console.log('ping()');
});

client.add(1, 1, (err, response) => {
  console.log(`"1+1=" + ${response}`);
});

const work = new ttypes.Work();
work.op = ttypes.Operation.DIVIDE;
work.num1 = 1;
work.num2 = 0;

client.calculate(1, work, (err, message) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Whoa? You know how to divide by zero?');
  }
  console.log(message);
});

work.op = ttypes.Operation.SUBTRACT;
work.num1 = 15;
work.num2 = 10;

client.calculate(1, work, (_, message) => {
  console.log(`15-10=${message}`);

  client.getStruct(1, (_, msg) => {
    console.log(`Check log: ${msg.value}`);

    // close the connection once we're done
    connection.end();
  });
});
