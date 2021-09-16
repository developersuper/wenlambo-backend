const fetch = require("node-fetch");

const { bnbAddress, ethAddress } = require("./constants");

module.exports = async (addresses, network) => {
  const query = `
    {
      ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
        dexTrades(
          options: {desc: ["block.timestamp.unixtime"], limitBy: { each: "quoteCurrency.address", limit: 1 }}
          baseCurrency: {is: "${network === "bsc" ? bnbAddress : ethAddress}"}
          quoteCurrency: {in: [${addresses
            .map((address) => `"${address}"`)
            .join(",")}]}
          tradeAmountUsd: {gt: 10}
        ) {
          quoteCurrency {
            address
            symbol
          }
          quotePrice
          block {
            timestamp {
              unixtime
            }
          }
        }
      }
    }
  `;
  const body = JSON.stringify({ query });
  settings = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": process.env.BITQUERY_KEY,
    },
    body,
  };
  fetchResponse = await fetch(`https://graphql.bitquery.io/`, settings);
  const {
    data: {
      ethereum: { dexTrades },
    },
  } = await fetchResponse.json();
  const priceBnbObject = {};
  dexTrades.forEach(({ quoteCurrency: { address }, quotePrice }) => {
    priceBnbObject[address] = 1 / quotePrice;
  });
  return priceBnbObject;
};
