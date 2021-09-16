const Sequelize = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;
const sequelize = new Sequelize(DATABASE_URL);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.users = require('./models/user.js')(sequelize, Sequelize)

module.exports = db;