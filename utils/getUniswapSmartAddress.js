const fetch = require("node-fetch");

const { ethAddress } = require("./constants");

module.exports = async (address) => {
  const query = `
    {
      ethereum(network: ethereum) {
        dexTrades(
          options: {limit: 1}
          exchangeName: {is: "Uniswap"}
          baseCurrency: {is: "${address}"}
          quoteCurrency: {is: "${ethAddress}"}
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
