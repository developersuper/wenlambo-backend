const fetch = require("node-fetch");

const symbols = {
  $: "usd",
  "£": "gbp",
  A$: "aud",
  "€": "eur",
  "¥": "jpy",
  R: "zar",
};

module.exports = async (currency = "usd") => {
  const currencyName = symbols[currency] || currency;
  if (currencyName === "usd") return 1;
  const fetchResponse = await fetch(
    `https://data.fixer.io/api/latest?access_key=${
      process.env.FIXER_IO_KEY
    }&base=USD&symbols=${currencyName.toUpperCase()}`
  );
  const { success, rates } = await fetchResponse.json();
  if (!success) {
    console.log("FIXER API FAILED");
    return 1;
  }
  return rates[currencyName.toUpperCase()];
};
