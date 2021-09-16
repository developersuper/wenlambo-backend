const fetch = require("node-fetch");

module.exports = async (token, network) => {
  const query = `
    {
      ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
        transfers(
          currency: {is: "${token}"}
          sender: {is: "0x0000000000000000000000000000000000000000"}
        ) {
          amount
          receiver {
            address
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
        transfers: [
          {
            receiver: { address },
          },
        ],
      },
    },
  } = await fetchResponse.json();
  return address;
};
