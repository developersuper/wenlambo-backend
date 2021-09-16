const Web3 = require("web3");
const { ethers } = require("ethers");

const tokenAbi = require("../abi/token.json");

const BSC_NETWORK = process.env.BSC_NETWORK;

module.exports = [
  {
    key: "contractCheck",
    prototype: "(contractAddress: String): ContractCheck",
    run: async ({ contractAddress }) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(BSC_NETWORK);
        const Contract = new ethers.Contract(
          contractAddress,
          tokenAbi,
          provider
        );
        const ownerAdd = (await Contract.functions.owner()).toString();
        if (ownerAdd == "0x0000000000000000000000000000000000000000") {
          ownerRevoked = true;
        } else {
          ownerRevoked = false;
        }
        console.log(ownerAdd.toString());
        return {
          ownerAdd,
          ownerRevoked,
        };
      } catch (err) {
        console.log(err);
      }
    },
  },
  {
    key: "rugPull",
    prototype: "(contract: String): RugPull",
    run: async ({ contract }) => {
      try {
        const transferAllFunds = contract.includes(
          "transfer(address(this).balance)"
        );
        const mintAllowed = contract.includes("function mint(");
        const totalFunctions = (contract.match(/function/g) || []).length;
        var whitelistFunctions = 0;
        var transferSafe = "";
        if (contract.includes("function transfer(")) whitelistFunctions++;
        if (contract.includes("function balanceOf(")) whitelistFunctions++;
        if (contract.includes("function totalSupply(")) whitelistFunctions++;
        if (contract.includes("function decimals(")) whitelistFunctions++;
        if (contract.includes("function symbol(")) whitelistFunctions++;
        if (contract.includes("function name(")) whitelistFunctions++;
        if (contract.includes("function getOwner(")) whitelistFunctions++;
        if (contract.includes("function allowance(")) whitelistFunctions++;
        if (contract.includes("function approve(")) whitelistFunctions++;
        if (contract.includes("function transferFrom(")) whitelistFunctions++;
        if (contract.includes("event Transfer(")) whitelistFunctions++;
        if (contract.includes("event Approval(")) whitelistFunctions++;

        if (contract.includes("function mul(")) whitelistFunctions++;
        if (contract.includes("function div(")) whitelistFunctions++;
        if (contract.includes("function sub(")) whitelistFunctions++;
        if (contract.includes("function add(")) whitelistFunctions++;

        if (contract.includes("event OwnershipTransferred("))
          whitelistFunctions++;
        if (contract.includes("function owner(")) whitelistFunctions++;
        if (contract.includes("function transferOwnership("))
          whitelistFunctions++;
        if (contract.includes("modifier onlyOwner(")) whitelistFunctions++;

        if (contract.includes("transfer(")) transferSafe = true;
        else transferSafe = false;

        // const whitelistFunctions = contract.includes("function transfer(");

        return {
          transferAllFunds,
          mintAllowed,
          totalFunctions,
          whitelistFunctions,
          transferSafe,
        };
      } catch (err) {
        console.log(err);
      }
    },
  },
];
