module.exports = `
  type Currency {
    id: String
    address: String
    name: String
    symbol: String
    price: Float
    logo: String
    count: Int
  }
  type CurrencyGain {
    address: String
    name: String
    symbol: String
    price: Float
    volume: Float
    increase: Float
  }
`;
