const program = require('commander');

const generateGenesis = require('./src/genesis');
const verifyGenesis = require('./src/verify');

program
  .version('0.0.1', '-v --version');

/** Generate genesis chain specification */
program
  .command('genesis')
  .option('--atBlock <num>', 'The Ethereum block number to pull state from.', 'latest')
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
