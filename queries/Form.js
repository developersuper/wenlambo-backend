const fetch = require("node-fetch");

const { submitContactForm } = require("../mailers/contactMailers");

module.exports = [
  {
    key: "submitContactForm",
    prototype:
      "(customerName: String, email: String, description: String): Boolean",
    mutation: true,
    run: async ({ customerName, email, description }) => {
      await submitContactForm({ customerName, email, description });
      return true;
    },
  },
];
