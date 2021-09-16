const fetch = require("node-fetch");

const getPancakeV2SmartAddress = require("./getPancakeV2SmartAddress");
const getUniswapSmartAddress = require("./getUniswapSmartAddress");
const { bnbAddress, ethAddress } = require("./constants");

module.exports = async (address, lpAddress, network = "bsc") => {
  const mainCurrency = network === "bsc" ? bnbAddress : ethAddress;
  if (address && address.toLowerCase() === mainCurrency.toLowerCase()) {
    return { totalLiquidity: 0 };
  }
  const smartContractAddress =
    lpAddress ||
    (network === "bsc"
      ? await getPancakeV2SmartAddress(address)
      : await getUniswapSmartAddress(address));
  const query = `
    {
      ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
        address(address: {is: "${smartContractAddress}"}) {
          balances(currency: { is: "${
            network === "bsc" ? bnbAddress : ethAddress
          }" }) {
            value
          }
        }
      }
    }
  `;
  const body = JSON.stringify({
    query,
  });
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
        address: [
          {
            balances: [{ value: totalLiquidity }],
          },
        ],
      },
    },
  } = await fetchResponse.json();
  return { totalLiquidity };
};
