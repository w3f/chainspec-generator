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
  .action(verifyGenesis);

program
  .parse(process.argv);
