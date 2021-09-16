const fetch = require("node-fetch");
const _ = require("lodash");

const getDevAddress = require("../utils/getDevAddress");
const getUsdPrice = require("../utils/getUsdPrice");
const { bnbAddress, ethAddress } = require("../utils/constants");

module.exports = [
  {
    key: "topGainers",
    prototype: "(minutes: Int, limit: Int, isLoser: Boolean): [CurrencyGain]",
    run: async (
      { minutes = 5, limit = 30, isLoser = false },
      { network = "bsc" }
    ) => {
      const since = new Date(new Date().getTime() - 1000 * 60 * minutes);
      try {
        const body = JSON.stringify({
          query: `
            query GetTopGainers($since: ISO8601DateTime!) {
              ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
                dexTrades(
                  options: { ${
                    isLoser ? "asc" : "desc"
                  }: "close_price / _aq.open_price", limit: ${limit} },
                  quoteCurrency: { is: "${
                    network === "bsc" ? bnbAddress : ethAddress
                  }" },
                  time: { since: $since }
                  tradeAmountUsd: {gt: 10}
                ) {
                  baseCurrency {
                    name
                    address
                    symbol
                  }
                  tradeAmount(in: USD)
                  open_price: minimum(of: block, get: quote_price)
                  close_price: maximum(of: block, get: quote_price)
                }
              }
            }
          `,
          variables: {
            since,
          },
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
        const fetchResponse = await fetch(
          `https://graphql.bitquery.io/`,
          settings
        );

        const {
          data: {
            ethereum: { dexTrades },
          },
        } = await fetchResponse.json();
        const bnbUsdPrice = await getUsdPrice();
        const gainers = dexTrades.map(
          ({
            baseCurrency: { name, address, symbol },
            open_price,
            close_price,
            tradeAmount,
          }) => ({
            name,
            address,
            symbol,
            price: (close_price || 0) * bnbUsdPrice,
            volume: tradeAmount,
            increase: ((close_price - open_price) * 100) / open_price,
          })
        );
        return gainers;
      } catch (e) {
        console.log(e);
        return [];
      }
    },
  },
  {
    key: "contractEvents",
    prototype: "(limit: Int): [ContractEvent]",
    run: async ({ limit = 30 }, { network = "bsc" }) => {
      const ownerEvents = [
        "AdminChanged",
        "AdminClaimed",
        "AdminTransferred",
        "AdminUpdated",
        "AdminshipTransferred",
        "Admined",
        "NewAdmin",
        "NewOwner",
        "OwnerAdded",
        "OwnerAddition",
        "OwnerChanged",
        "OwnerNominated",
        "OwnershipRenounced",
        "OwnerUpdate",
        "OwnershipAdded",
        "OwnershipTransfer",
        "OwnershipTransferCompleted",
        "OwnershipTransferInitiated",
        "OwnershipTransferPrepared",
        "OwnershipTransfered",
        "SetOwner",
      ];
      const creationEvents = [
        "Birth",
        "Created",
        "Created2",
        "CreateToken",
        "Deploy",
        "Deployed",
        "Initialize",
        "Initialized",
        "NewToken",
        "NewTokenCommitted",
        "NewTokenRegistered",
        "Register",
        "RegisterEvent",
        "Registered",
        "Registration",
        "Release",
        "ReleaseTokens",
        "Released",
        "SmartTokenAdded",
      ];
      try {
        const query = `
          {
            ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
              smartContractEvents(
                options: { limit: ${
                  limit * 2
                }, desc: "block.timestamp.unixtime", limitBy: { each: "smartContract.currency.symbol", limit: 2 } },
                smartContractEvent: { in: [
                  ${[...creationEvents, ...ownerEvents]
                    .map((event) => `"${event}"`)
                    .join(",")}
                ] },
              ) {
                block {
                  timestamp {
                    unixtime
                  }
                }
                smartContract {
                  address {
                    address
                    annotation
                  }
                  currency {
                    symbol
                    name
                  }
                  contractType
                  protocolType
                }
                smartContractEvent {
                  name
                  signature
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
        const fetchResponse = await fetch(
          `https://graphql.bitquery.io/`,
          settings
        );

        const {
          data: {
            ethereum: { smartContractEvents },
          },
        } = await fetchResponse.json();
        const contractEvents = smartContractEvents
          .filter(
            ({
              smartContract: {
                currency: { symbol },
              },
            }) => symbol !== "-"
          )
          .map(
            ({
              block: {
                timestamp: { unixtime },
              },
              smartContract: {
                address: { address },
                currency: { symbol, name: currencyName },
              },
              smartContractEvent: { name },
            }) => ({
              unixtime,
              event: creationEvents.indexOf(name) === -1 ? "Owner" : "New",
              currency: {
                name: currencyName,
                symbol,
                address,
              },
            })
          );
        return _.uniqBy(
          contractEvents,
          (o) => `${o.currency.address}-${o.event}`
        ).slice(0, limit);
      } catch (e) {
        console.log(e);
        return [];
      }
    },
  },
  {
    key: "bnbPrice",
    prototype: "(currency: String): Float",
    run: async ({ currency }, { network = "bsc" }) => {
      return await getUsdPrice(currency, network);
    },
  },
  {
    key: "devActivities",
    prototype: "(token: String): [Transfer]",
    run: async ({ token }, { network = "bsc" }) => {
      const devAddress = await getDevAddress(token, network);
      const query = `
        {
          ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
            transfers(
              options: {
                desc: "block.timestamp.time",
                asc: "currency.symbol",
                limit: 2000
              }
              amount: {gt: 0}
              sender: {is: "${devAddress}"}
            ) {
              block {
                timestamp {
                  time(format: "%Y-%m-%dT%H:%M:%SZ")
                }
              }
              address: receiver {
                address
                annotation
                smartContract	{
                  contractType
                }
              }
              currency {
                address
                symbol
              }
              amount
              transaction {
                hash
              }
            }
          }
        }
      `;
      const body = JSON.stringify({ query });
      const settings = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-KEY": process.env.BITQUERY_KEY,
        },
        body,
      };
      const fetchResponse = await fetch(
        `https://graphql.bitquery.io/`,
        settings
      );

      const {
        data: {
          ethereum: { transfers },
        },
      } = await fetchResponse.json();
      return transfers.map(
        ({
          block: {
            timestamp: { time },
          },
          address: {
            address,
            smartContract: { contractType },
          },
          currency,
          amount,
          transaction: { hash },
        }) => ({
          time,
          address,
          contractType,
          currency,
          amount,
          hash,
        })
      );
    },
  },
];
