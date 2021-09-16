const fetch = require("node-fetch");
const _ = require("lodash");

module.exports = async ({ from, to }, network = "bsc") => {
  if (from.toLowerCase() === to.toLowerCase()) return `1:0`;
  const query = `
    {
      ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
        dexTrades(
          options: {limit: 1, desc: "block.timestamp.time"}
          baseCurrency: {is: "${from}"}
          quoteCurrency: {is: "${to}"}
          tradeAmountUsd: {gt: 10}
        ) {
          block {
            timestamp {
              time(format: "%Y-%m-%d %H:%M:%S")
            }
          }
          count
          quotePrice(calculate: median)
          baseCurrency {
            decimals
          }
        }
      }
    }      
  `;
  const settings = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": process.env.BITQUERY_KEY,
    },
    body: JSON.stringify({ query }),
  };
  const fetchResponse = await fetch(`https://graphql.bitquery.io/`, settings);
  const {
    data: {
      ethereum: { dexTrades },
    },
  } = await fetchResponse.json();
  const sumPrice = _.sumBy(
    dexTrades,
    ({ count, quotePrice }) => count * quotePrice
  );
  const sumCount = _.sumBy(dexTrades, ({ count }) => count);
  const [
    {
      baseCurrency: { decimals },
    },
  ] = dexTrades;
  const quotePrice = sumPrice / sumCount;
  return `${quotePrice}:${decimals}`;
};
