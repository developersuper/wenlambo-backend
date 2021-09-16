const fetch = require("node-fetch");
const _ = require("lodash");

const getBnbPrices = require("../utils/getBnbPrices");
const getUsdPrice = require("../utils/getUsdPrice");
const getSupply = require("../utils/getSupply");
const getLPHoldings = require("../utils/getLPHoldings");
const getWalletLPHolding = require("../utils/getWalletLPHolding");
const { bnbAddress, ethAddress } = require("../utils/constants");

const lamboLPAddress = "0x2c9e04bfa4dbf11c599fea275d4e34604443789f";

const getBalances = async (walletAddress, network = "bsc") => {
  const fetchResponse = await fetch(
    `https://api.covalenthq.com/v1/${
      network === "bsc" ? 56 : 1
    }/address/${walletAddress}/balances_v2/?&key=${process.env.COVALENTHQ_CKEY}`
  );
  const {
    data: { items },
  } = await fetchResponse.json();
  if (!items || !items.length) {
    if (network === "bsc") {
      return [
        {
          currency: {
            symbol: "BNB",
            name: "Binance Smart Chain Native Token",
            address: bnbAddress,
          },
          value: 0,
        },
      ];
    } else {
      return [
        {
          currency: {
            symbol: "ETH",
            name: "Ether",
            address: ethAddress,
          },
          value: 0,
        },
      ];
    }
  }
  return items.map(
    ({
      balance,
      contract_address,
      contract_name,
      contract_ticker_symbol,
      logo_url,
      contract_decimals,
    }) => ({
      value: balance / Math.pow(10, contract_decimals),
      currency: {
        address: contract_address,
        name: contract_name,
        symbol: contract_ticker_symbol,
        logo: logo_url,
      },
    })
  );
};

module.exports = [
  {
    key: "balances",
    prototype: "(walletAddress: String, currency: String): [Balance]",
    run: async ({ walletAddress, currency }, { network = "bsc" }) => {
      let balances = [];
      try {
        balances = await getBalances(walletAddress, network);
      } catch (e) {
        console.log(e);
      }
      const bnbPrices = await getBnbPrices(
        balances
          .filter(
            ({ currency: { symbol } }) => symbol !== "BNB" && symbol !== "ETH"
          )
          .map(({ currency: { address } }) => address),
        network
      );
      const usdPrice = await getUsdPrice(currency, network);
      return _.orderBy(
        balances
          .filter(
            ({ currency: { address, symbol } }) =>
              symbol === "BNB" || symbol === "ETH" || bnbPrices[address]
          )
          .map((balance) => ({
            value: balance.value,
            currency: {
              name: balance.currency.name,
              symbol: balance.currency.symbol,
              address:
                balance.currency.symbol === "BNB"
                  ? bnbAddress
                  : balance.currency.symbol === "ETH"
                  ? ethAddress
                  : balance.currency.address,
              price:
                balance.currency.symbol === "BNB" ||
                balance.currency.symbol === "ETH"
                  ? usdPrice
                  : bnbPrices[balance.currency.address] * usdPrice,
            },
            bnbValue:
              balance.currency.symbol === "BNB" ||
              balance.currency.symbol === "ETH"
                ? balance.value
                : balance.value * bnbPrices[balance.currency.address],
          })),
        [({ value, currency: { price } }) => value * price],
        ["desc"]
      );
    },
  },
  {
    key: "lamboLP",
    prototype: "(walletAddress: String): LPHolding",
    run: async ({ walletAddress }) => {
      const [
        { amountSent, amountReceived },
        { totalLiquidity },
        bnbUsdPrice,
        walletLPHolding,
      ] = await Promise.all([
        getSupply(lamboLPAddress),
        getLPHoldings(null, lamboLPAddress),
        getUsdPrice(),
        getWalletLPHolding(walletAddress),
      ]);
      const totalSupply = amountSent - amountReceived;
      const percentage = (walletLPHolding * 100) / totalSupply;
      const usdValue = ((totalLiquidity * bnbUsdPrice) / 100) * percentage;
      return {
        usdValue,
        percentage,
        lpHolding: walletLPHolding,
      };
    },
  },
  {
    key: "testMutation",
    prototype: ": Boolean",
    mutation: true,
    run: async () => {
      return true;
    },
  },
];
