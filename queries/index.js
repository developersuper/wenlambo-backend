const balanceQueries = require("./Balance");
const formQueries = require("./Form");
const historyQueries = require("./History");
const toolsQueries = require("./Tools");
const rugChecker = require("./RugChecker");

const allQueries = [
  ...balanceQueries,
  ...formQueries,
  ...historyQueries,
  ...toolsQueries,
  ...rugChecker,
];

const queries = allQueries
  .filter(({ mutation }) => !mutation)
  .map(({ key, prototype }) => `${key}${prototype}`)
  .join(",\n  ");

const mutations = allQueries
  .filter(({ mutation }) => mutation)
  .map(({ key, prototype }) => `${key}${prototype}`)
  .join(",\n  ");

const root = {};
allQueries.forEach(({ key, run }) => {
  root[key] = run;
});

module.exports = {
  queries,
  mutations,
  root,
};
