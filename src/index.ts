import program from "commander";

import generateGenesis from "./genesis";
import verify from "./verify";

/// Infura Endpoint
const InfuraMainnet =
  "https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159";

program.version("0.1.0", "-v --version");

/** Generate genesis chain specification */
program
  .command("genesis")
  .option(
    "--atBlock <num>",
    "The Ethereum block number to pull state from.",
    "latest"
  )
  .option("--claims <contract>", "The address of the Claims contract.")
  .option(
    "--endpoint <httpEndpoint>",
    "The HTTP endpoint for the Ethereum node to connect to.",
    InfuraMainnet
  )
  .option(
    "--template <path>",
    "The path of the template to use in the chainspec generation."
  )
  .option(
    "--tmpOutput <file>",
    "The filepath to drop the temporary output, to get sent through post-processing."
  )
  .option("--test", "Enable testing mode.", false)
  .action(generateGenesis);

/** Verify genesis state */
program
  .command("verify")
  .option(
    "--atBlock <num>",
    "The Ethereum block number to check state against.",
    "latest"
  )
  .option(
    "--claims <contract>",
    "The address of the Claims contract.",
    "0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907"
  )
  .option(
    "--endpoint <string>",
    "The websockets endpoint of the Polkadot chain.",
    "ws://localhost:9944"
  )
  .action(verify);

program.parse(process.argv);
