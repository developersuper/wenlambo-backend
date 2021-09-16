const fetch = require("node-fetch");

const { bnbAddress } = require("./constants");

module.exports = async (address) => {
  const query = `
    {
      ethereum(network: bsc) {
        dexTrades(
          options: {limit: 1}
          exchangeName: {is: "Pancake v2"}
          baseCurrency: {is: "${address}"}
          quoteCurrency: {is: "${bnbAddress}"}
        ) {
          smartContract {
            address {
              address
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
      ethereum: {
        dexTrades: [
          {
            smartContract: {
              address: { address: result },
            },
          },
        ],
      },
    },
  } = await fetchResponse.json();
  return result;
};
