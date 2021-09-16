const fetch = require("node-fetch");
const _ = require("lodash");

const getCurrencyRate = require("./getCurrencyRate");
const {
  bnbAddress,
  busdAddress,
  ethAddress,
  usdtAddress,
} = require("./constants");

module.exports = async (currency = "usd", network = "bsc") => {
  const body = JSON.stringify({
    query: `
      {
        ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
          dexTrades(
            options: {limit: 5, desc: "block.timestamp.time"}
            baseCurrency: {is: "${network === "bsc" ? bnbAddress : ethAddress}"}
            quoteCurrency: {is: "${
              network === "bsc" ? busdAddress : usdtAddress
            }"}
            tradeAmountUsd: {gt: 10}
          ) {
            block {
              timestamp {
                time(format: "%Y-%m-%d %H:%M:%S")
              }
            }
            count
            quotePrice(calculate: median)
          }
        }
      }
    `,
  });

  const settings = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": process.env.BITQUERY_KEY,
    },
    body,
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
  const currencyRate = await getCurrencyRate(currency);
  return (sumPrice * currencyRate) / sumCount;
};
