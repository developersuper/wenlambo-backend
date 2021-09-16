const fetch = require("node-fetch");

const lamboLPAddress = "0x2c9e04bfa4dbf11c599fea275d4e34604443789f";

module.exports = async (address) => {
  const query = `
    {
      ethereum(network: bsc) {
        address(address: { is: "${address}" }) {
          balances(currency: { is: "${lamboLPAddress}"}) {
            value
          }
        }
      }
    }
  `;
  const body = JSON.stringify({
    query,
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
      ethereum: {
        address: [{ balances }],
      },
    },
  } = await fetchResponse.json();
  return balances[0]?.value || 0;
};
