const fetch = require("node-fetch");
const moment = require("moment");
const _ = require("lodash");

const getBnbPrices = require("../utils/getBnbPrices");
const getLPHoldings = require("../utils/getLPHoldings");
const getUsdPrice = require("../utils/getUsdPrice");
const getQuotePrice = require("../utils/getQuotePrice");
const getCurrencyRate = require("../utils/getCurrencyRate");
const getSupply = require("../utils/getSupply");
const searchTokens = require("../utils/searchTokens");
const {
  bnbAddress,
  ethAddress,
  busdAddress,
  usdtAddress,
} = require("../utils/constants");

const getCandles = async (settings, currency = "usd") => {
  try {
    const rate = await getCurrencyRate(currency);
    const fetchResponse = await fetch(`https://graphql.bitquery.io/`, settings);
    const {
      data: {
        ethereum: { dexTrades },
      },
    } = await fetchResponse.json();
    if (dexTrades && dexTrades.length) {
      return dexTrades.map(
        ({
          timeInterval: { minute },
          tradeAmount,
          maximum_price,
          minimum_price,
          open_price,
          close_price,
        }) => {
          return {
            time: new Date(minute).getTime() / 1000,
            volume: tradeAmount,
            high: Number(maximum_price) * rate,
            low: Number(minimum_price) * rate,
            open: Number(open_price) * rate,
            close: Number(close_price) * rate,
          };
        }
      );
    }
    return [];
  } catch (e) {
    console.log(e);
    return [];
  }
};

module.exports = [
  {
    key: "candleData",
    prototype:
      "(baseCurrency: String, quoteCurrency: String, since: String, till: String, window: Int, currency: String): [Candle]",
    run: async (
      { baseCurrency, quoteCurrency, since, till, window, currency },
      { network = "bsc" }
    ) => {
      const addr = network === "bsc" ? bnbAddress : ethAddress;
      const settings = (base, quote) => {
        const body = JSON.stringify({
          operationName: "GetCandleData",
          query: `
            query GetCandleData($baseCurrency: String!, $since: ISO8601DateTime, $till: ISO8601DateTime, $quoteCurrency: String!, $exchangeAddresses: [String!], $minTrade: Float, $window: Int) {
              ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
                dexTrades(
                  options: {asc: "timeInterval.minute"}
                  time: {since: $since, till: $till}
                  exchangeAddress: {in: $exchangeAddresses}
                  baseCurrency: {is: $baseCurrency}
                  quoteCurrency: {is: $quoteCurrency}
                  tradeAmountUsd: {gt: $minTrade}
                ) {
                  timeInterval {
                    minute(count: $window, format: "%Y-%m-%dT%H:%M:%SZ")
                  }
                  tradeAmount(in: USD)
                  trades: count
                  quotePrice
                  maximum_price: quotePrice(calculate: maximum)
                  minimum_price: quotePrice(calculate: minimum)
                  open_price: minimum(of: block, get: quote_price)
                  close_price: maximum(of: block, get: quote_price)
                }
              }
            }
          `,
          variables: {
            baseCurrency: base,
            quoteCurrency: quote,
            since: new Date(Number(since)),
            till: new Date(Number(till)),
            window,
            minTrade: 10,
            exchangeAddresses: [
              network === "bsc"
                ? "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
                : "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
            ],
            // exchangeAddresses: [],
          },
        });
        return {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-API-KEY": process.env.BITQUERY_KEY,
          },
          body,
        };
      };
      if (quoteCurrency === addr) {
        // BNB
        return await getCandles(settings(baseCurrency, quoteCurrency));
      } else if (baseCurrency === addr) {
        return await getCandles(
          settings(baseCurrency, quoteCurrency),
          currency
        );
      }
      const bnbCandles = await getCandles(settings(baseCurrency, addr));
      const usdCandles = await getCandles(
        settings(addr, quoteCurrency),
        currency
      );
      let usdCandleIndex = 0;
      const result = [];
      for (let i = 0; i < bnbCandles.length; i++) {
        const bnbCandle = bnbCandles[i];
        let usdCandle = usdCandles[usdCandleIndex];
        while (
          usdCandle &&
          usdCandle.time < bnbCandle.time &&
          usdCandleIndex < usdCandles.length
        ) {
          usdCandleIndex++;
          usdCandle = usdCandles[usdCandleIndex];
        }
        if (usdCandleIndex === usdCandles.length) break;
        if (usdCandle.time > bnbCandle.time) continue;
        /*if (i > bnbCandles.length - 5) {
          console.log("*****");
          console.log(bnbCandle, usdCandle);
          console.log("*****");
        }*/
        result.push({
          time: usdCandle.time,
          volume: bnbCandle.volume,
          high: usdCandle.high * bnbCandle.high,
          low: usdCandle.low * bnbCandle.low,
          open: usdCandle.open * bnbCandle.open,
          close: usdCandle.close * bnbCandle.close,
        });
      }
      return result;
    },
  },
  {
    key: "tokens",
    prototype: "(search: String, base: String, quote: String): [Currency]",
    run: async ({ search, base, quote }, { network = "bsc" }) => {
      if (!search || search.length < 2) return [];
      try {
        let tokens = await searchTokens(search, network);
        let query = "";
        if (base || quote) {
          if (base) {
            query = `
              {
                ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
                  dexTrades(
                    baseCurrency: { is: "${base}" },
                    quoteCurrency: { in: [${tokens
                      ?.map(({ address }) => `"${address}"`)
                      .join(", ")}] }
                  ) {
                    currency: quoteCurrency {
                      name
                      symbol
                      address
                    }
                    count
                  }
                }
              }
            `;
          } else {
            query = `
              {
                ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
                  dexTrades(
                    quoteCurrency: { is: "${quote}" },
                    baseCurrency: { in: [${tokens
                      ?.map(({ address }) => `"${address}"`)
                      .join(", ")}] }
                  ) {
                    currency: baseCurrency {
                      name
                      symbol
                      address
                    }
                    count
                  }
                }
              }
            `;
          }
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
              ethereum: { dexTrades },
            },
          } = await fetchResponse.json();
          return tokens.map(({ address, name, symbol }) => {
            const cur = dexTrades.find(
              ({ currency }) => address === currency.address
            );
            const count = cur?.count || 0;
            return {
              address,
              name,
              symbol,
              count,
            };
          });
        }
        return tokens;
      } catch (e) {
        console.log(e);
        return [];
      }
    },
  },
  {
    key: "trades",
    prototype:
      "(address: String, quoteAddress: String, limit: Int, currency: String, wallet: String): [Trade]",
    run: async (
      { address, quoteAddress: quote, limit, currency = "usd", wallet },
      { network = "bsc" }
    ) => {
      console.log("here--")
      console.log("address", address, limit, currency, wallet, quote);
      try {
        const quoteCurrency =
          quote || network === "bsc"
            ? address === bnbAddress
              ? busdAddress
              : bnbAddress
            : address === ethAddress
            ? usdtAddress
            : ethAddress;
        const query = `
          {
            ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
              dexTrades(
                options: {desc: "timeInterval.second", limit: ${limit || 50}}
                baseCurrency: {is: "${address}"}
                quoteCurrency: {is: "${quoteCurrency}"}
                ${wallet ? `txSender: { is: "${wallet}" }` : ""}
              ) {
                timeInterval {
                  second
                }
                side
                tradeAmount(in: USD)
                exchange {
                  fullName
                }
                buyAmount
                buyCurrency {
                  symbol
                  address
                }
                sellAmount
                sellCurrency {
                  symbol
                  address
                }
                transaction {
                  hash
                  txFrom {
                    address
                  }
                }
              }
            }
          }
        `;
        const body = JSON.stringify({
          query,
        });
        let settings = {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-API-KEY": process.env.BITQUERY_KEY,
          },
          body,
        };
        let fetchResponse = await fetch(
          `https://graphql.bitquery.io/`,
          settings
        );
        let {
          data: {
            ethereum: { dexTrades },
          },
        } = await fetchResponse.json();
        const rate = await getCurrencyRate(currency);
        const normalized = dexTrades.map(
          ({
            timeInterval: { second },
            side,
            tradeAmount,
            buyAmount,
            sellAmount,
            transaction: {
              hash,
              txFrom: { address },
            },
          }) => ({
            side,
            txHash: hash,
            time: second,
            buyAmount,
            sellAmount,
            amountInUSD: tradeAmount * rate,
            taker: address,
          })
        );
        const takers = _.uniq(normalized.map(({ taker }) => taker));
        const since = moment().subtract(30, "days").format("YYYY-MM-DD");
        await Promise.all(
          takers.map(async (taker) => {
            const takerQuery = `
              {
                ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
                  dexTrades(
                    date: { since: "${since}" }
                    any: [
                      { baseCurrency: { is: "${
                        network === "bsc" ? bnbAddress : ethAddress
                      }" } },
                      { quoteCurrency: { is: "${
                        network === "bsc" ? bnbAddress : ethAddress
                      }" } },
                    ]
                    txSender: { is: "${taker}" }
                  ) {
                    tradeAmount(in: USD)
                    count
                  }
                }
              }
            `;
            settings = {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-API-KEY": process.env.BITQUERY_KEY,
              },
              body: JSON.stringify({ query: takerQuery }),
            };
            fetchResponse = await fetch(
              `https://graphql.bitquery.io/`,
              settings
            );
            const {
              data: {
                ethereum: {
                  dexTrades: [{ tradeAmount, count }],
                },
              },
            } = await fetchResponse.json();
            normalized.forEach((row) => {
              if (row.taker === taker) {
                row.amount = tradeAmount;
                row.count = count;
              }
            });
          })
        );
        return normalized;
      } catch (e) {
        console.log(e);
        return [];
      }
    },
  },
  {
    key: "trends",
    prototype: "(since: String!, currency: String, limit: Int): [Currency]",
    run: async ({ since, currency = "usd", limit = 18 }, { network }) => {
      const query = `
        {
          ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}) {
            dexTrades (
              date: { since: "${since}" }
              options:{desc: "count", limit: 20},
              quoteCurrency: { is: "${
                network === "bsc" ? bnbAddress : ethAddress
              }" }
              tradeAmountUsd: {gt: 10}
            ) {
              baseCurrency {
                symbol
                address
                name
              }
              quotePrice
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
      const fetchResponse = await fetch(
        `https://graphql.bitquery.io/`,
        settings
      );
      const {
        data: {
          ethereum: { dexTrades },
        },
      } = await fetchResponse.json();
      const bnbUsdPrice = await getUsdPrice(currency, network);
      let staticTrends =
        network === "bsc"
          ? [
              {
                symbol: "LGBTQ+",
                name: "THIS IS ME",
                address: "0x16b1e6fd516c99da619fdd4ebad7696469c29c0e",
              },
              {
                symbol: "(LAMBO)",
                name: "WEN LAMBO",
                address: "0x2c7b396d17e3a5184d4901380836de7a72c5cba4",
              },
              {
                symbol: "Retire",
                name: "Retirement token",
                address: "0xA8d27c978E4ADE9629cFb2d2849e2CFf46c85Da5",
              },
            ]
          : [];
      const bnbPrices = await getBnbPrices(
        staticTrends.map(({ address }) => address),
        network
      );
      staticTrends = staticTrends.map((staticTrend) => ({
        ...staticTrend,
        price:
          (bnbPrices[staticTrend.address.toLowerCase()] || 0) * bnbUsdPrice,
      }));
      const normalized = dexTrades
        .map(({ baseCurrency, quotePrice }) => ({
          ...baseCurrency,
          price: quotePrice * bnbUsdPrice,
        }))
        .filter(
          ({ symbol }) =>
            ["BUSD", "ETH", "USDT", "BTCB", "WBUSD", "UST"].indexOf(symbol) ===
            -1
        );
      return _.orderBy(
        [...staticTrends, ...normalized],
        [(o) => Math.random()],
        ["asc"]
      ).slice(0, limit);
    },
  },
  {
    key: "quotePrice",
    prototype: "(from: String!, to: String!): String",
    run: async ({ from, to }, { network = "bsc" }) => {
      return await getQuotePrice({ from, to }, network);
    },
  },
  {
    key: "tokenInfo",
    prototype: "(address: String, currency: String): TokenInfo",
    run: async ({ address, currency = "usd" }, { network = "bsc" }) => {
      const { amountSent, amountReceived, countTransfers } = await getSupply(
        address,
        network
      );
      const bnbUsdPrice = await getUsdPrice(currency, network);
      const [quoteBnbPrice] = (
        await getQuotePrice(
          {
            from: address,
            to: network === "bsc" ? bnbAddress : ethAddress,
          },
          network
        )
      ).split(":");
      const totalSupply = amountSent - amountReceived;
      const marketBnbCap = totalSupply * quoteBnbPrice;
      const { totalLiquidity } = await getLPHoldings(address, null, network);

      return {
        totalSupply,
        transfers: countTransfers,
        marketBnbCap,
        marketCap: marketBnbCap * bnbUsdPrice,
        price: quoteBnbPrice * bnbUsdPrice,
        totalLiquidityBNB: totalLiquidity,
        totalLiquidityUSD: totalLiquidity * bnbUsdPrice,
      };
    },
  },
  {
    key: "searchToken",
    prototype: "(address: String): Currency",
    run: async ({ address: tokenAddress }, { network = "bsc" }) => {
      try {
        const query = `
        {
          ethereum(network: ${network === "bsc" ? "bsc" : "ethereum"}){
            smartContractCalls(smartContractAddress: {is: "${tokenAddress}"}, options: { limit: 1 }){
              smartContract {
                address {
                  address
                }
                currency {
                  name
                  symbol
                }
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
        const fetchResponse = await fetch(
          `https://graphql.bitquery.io/`,
          settings
        );
        const {
          data: {
            ethereum: {
              smartContractCalls: [
                {
                  smartContract: {
                    address: { address },
                    currency: { name, symbol },
                  },
                },
              ],
            },
          },
        } = await fetchResponse.json();
        return { name, symbol, address };
      } catch (e) {
        console.log(e);
        return null;
      }
    },
  },
];
