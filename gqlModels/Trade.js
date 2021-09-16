module.exports = `
  type Trade {
    side: String
    txHash: String
    time: String
    buyAmount: Float
    sellAmount: Float
    amountInUSD: Float
    taker: String
    count: Int
    amount: Float
  }
`;
