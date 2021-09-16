const Currency = require("./Currency");
const Balance = require("./Balance");
const Candle = require("./Candle");
const ContractEvent = require("./ContractEvent");
const LPHolding = require("./LPHolding");
const Trade = require("./Trade");
const TokenInfo = require("./TokenInfo");
const Transfer = require("./Transfer");
const ContractCheck = require("./ContractCheck");
const RugPull = require("./RugPull");

module.exports = `
  ${Currency}
  ${Balance}
  ${Candle}
  ${ContractEvent}
  ${LPHolding}
  ${Trade}
  ${TokenInfo}
  ${Transfer}
  ${ContractCheck}
  ${RugPull}
`;
