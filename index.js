const program = require('commander');

const generateGenesis = require('./src/genesis');
const verifyGenesis = require('./src/verify');

/// Infura Endpoint
const InfuraMainnet = 'https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159';

program
  .version('0.0.1', '-v --version');

/** Generate genesis chain specification */
program
  .command('genesis')
  .option('--atBlock <num>', 'The Ethereum block number to pull state from.', 'latest')
  .option('--claims <contract>', 'The address of the Claims contract.')
  .option('--endpoint <httpEndpoint>', 'The HTTP endpoint for the Ethereum node to connect to.', InfuraMainnet)
  .option('--template <path>', 'The path of the template to use in the chainspec generation.')
  .option('--tmpOutput <file>', 'The filepath to drop the temporary output, to get sent through post-processing.')
  .option('--test', 'Enable testing mode.', false)
  .action(generateGenesis);

/** Verify genesis state */
program
  .command('verify')
  .option('--atBlock <num>', 'The Ethereum block number to check state against.', 'latest')
  .option('--endpoint <string>', 'The websockets endpoint of the Polkadot chain.', 'ws://localhost:9944')
  .action(verifyGenesis);

program
  .parse(process.argv);
