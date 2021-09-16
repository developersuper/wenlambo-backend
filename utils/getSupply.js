const fetch = require("node-fetch");

const { ethAddress, bnbAddress } = require("./constants");

module.exports = async (address, network = "bsc") => {
  const mainAddress = network === "bsc" ? bnbAddress : ethAddress;
  if (mainAddress.toLowerCase() === address.toLowerCase()) {
    const query = `
      {
        ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
          transfersCount: transfers(
            currency: {is: "${address}"}
            sender: {not: "${address}"}
            receiver: {not: "${address}"}
          ) {
            countTransfers: count
          }
          totalSupply: transfers(
            currency: {is: "${address}"}
          ) {
            amountSent: amount(sender: { is: "${address}"})
            amountReceived: amount(receiver: { is: "${address}"})
            count
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
        ethereum: {
          transfersCount: [{ countTransfers }],
          totalSupply: [{ amountSent, amountReceived }],
        },
      },
    } = await fetchResponse.json();
    return { amountSent, amountReceived, countTransfers };
  }
  const query = `
    {
      ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
        transfers(
          currency: {is: "${address}"}
        ) {
          amountSent: amount(sender: { is: "0x0000000000000000000000000000000000000000"})
          amountReceived: amount(receiver: { is: "0x0000000000000000000000000000000000000000"})
          countTransfers: count
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
      ethereum: {
        transfers: [{ amountSent, amountReceived, countTransfers }],
      },
    },
  } = await fetchResponse.json();
  return { amountSent, amountReceived, countTransfers };
};
