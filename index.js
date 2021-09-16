const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const cors = require("cors");
const xss = require("xss-clean");

const dotenv = require("dotenv");

dotenv.config();

// const db = require('./db');
// db.sequelize.sync({ force: true }).then(() => {
//   console.log('Drop and re-sync db.');
// });

const models = require("./gqlModels");
const { queries, mutations, root } = require("./queries");

const app = express();
app.use(cors());
app.use(xss());

const schema = buildSchema(`
  ${models}
  type Query {
    ${queries}
  }
  type Mutation {
    ${mutations}
  }
`);

app.use(
  "/graphql",
  graphqlHTTP(async (req) => {
    // add the user to the context
    return {
      schema: schema,
      rootValue: root,
      graphiql: true,
      context: req.headers,
    };
  })
);

const PORT = process.env.PORT || 4000;

app.listen(PORT, function () {
  console.log(
    "==> Listening on port %s. Visit http://localhost:%s/graphql in your browser.",
    PORT,
    PORT
  );
});
