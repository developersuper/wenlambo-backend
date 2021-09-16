const fetch = require("node-fetch");

const { bnbAddress, ethAddress } = require("./constants");

module.exports = async (search, network) => {
  const networkString = network === "bsc" ? "bsc" : "ethereum";
  const query = `
    {
      search(string: "${search}", network: ${networkString})
      {
        network{
          network
        }
        subject {
          ... on Currency {
            symbol
            name
            address
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
    data: { search: items },
  } = await fetchResponse.json();
  return items.map(({ subject }) => subject);
};
