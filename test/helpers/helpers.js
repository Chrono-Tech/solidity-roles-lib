"use strict";

const Asserts = require('./asserts');
const asserts = Asserts(assert);

Array.prototype.unique = function() {
  return this.filter(function (value, index, self) {
      return self.indexOf(value) === index;
  });
}

Array.prototype.removeZeros = function() {
  return this.filter(function (value, index, self) {
      return value != 0x0 && value != 0 && value.valueOf() != '0'
  });
}


module.exports = {
  getSig: (callData) => web3.sha3(callData).slice(0, 10),
  increaseTime: (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime()
      }, (error, result) => error ? reject(error) : resolve(result.result))
    });
  },
  mine: () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, (error, result) => error ? reject(error) : resolve(result.result))
    });
  },
  assertExpectations: (mock, expected = 0, callsCount = null) => {
    let expectationsCount;
    return () => {
      return mock.expectationsLeft()
      .then(asserts.equal(expected))
      .then(() => mock.expectationsCount())
      .then(result => expectationsCount = result)
      .then(() => mock.callsCount())
      .then(result => asserts.equal(callsCount === null ? expectationsCount : callsCount)(result));
    };
  },

  ignoreAuth: (mock, enabled = true) => {
    return mock.ignore(roles2LibraryInterface.canCall.getData().slice(0, 10), enabled);
  },
  getFlag: index => {
    return web3.toBigNumber(2).pow(index*2);
  },
  getEvenFlag: index => {
    return web3.toBigNumber(2).pow(index*2 + 1);
  },
  eventEquals: (tx, event) => {
    assert.equal(tx.logs[0].event, event);
  },
  error: (tx, events, contract, text) => {
      const logs = tx.logs;

      for (logEntry of logs) {
          if (logEntry.event.toLowerCase() == "error") {
              assert.equal(logEntry.address, events.address);
              assert.equal(logEntry.event, "Error");
              assert.equal(logEntry.args.self, contract.address);
              assert.isTrue(web3.toAscii(logEntry.args.msg).includes(text));
          }
      }
  },
  assertLogs: (logs) => {
    return (tx) => {
      assert.equal(tx.logs.length, logs.length);
      for (let i in logs) {
        let log = logs[i];
        if (log.address) {
          assert.equal(tx.logs[i].address, log.address);
        }
        if (log.event) {
          assert.equal(tx.logs[i].event, log.event);
        }
        for (let a in log.args) {
          if (typeof log.args[a] === "array" || typeof log.args[a] === "object") {
            // Compare array lengths and contents
            assert.equal(tx.logs[i].args[a].length, log.args[a].length);
            for (let m in tx.logs[i].args[a]) {
              assert.equal(tx.logs[i].args[a][m], log.args[a][m]);
            }
          } else {
            assert.equal(tx.logs[i].args[a], log.args[a]);
          }
        }
      }
    }
  },
  assertJump: (error) => {
    assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');
  },

}
