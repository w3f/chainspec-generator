const pdKeyring = require('@polkadot/keyring');
const pdUtil = require('@polkadot/util');
const fs = require('fs');
const Web3 = require('web3');

const {
  assert,
  getW3,
  getClaimsContract,
  getFrozenTokenContract,
  getTokenHolderData,
  getClaimers,
} = require('./helpers');

const w3Util = (new Web3()).utils;

/// Amount of extra decimals to add to the values.
const DECIMALS = w3Util.toBN(1000000000);

/// Chain Specification Template
const ChainSpecTemplate = require('../template.json');

/// Vesting Length (six months for Kusama)
const VestingLength = Math.ceil(6 * 30 * 24 * 60 * (60 / 6)); // 6s block times

module.exports = async (cmd) => {
  const { atBlock, endpoint, test } = cmd;

  const w3 = getW3(endpoint);
  const kusamaClaims = getClaimsContract(w3);
  const dotAllocationIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(dotAllocationIndicator, kusamaClaims, atBlock);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders);

  // Write to chain spec any accounts that still need to claim.
  leftoverTokenHolders.forEach((value, key) => {
    ChainSpecTemplate.genesis.runtime.claims.claims.push([
      w3Util.hexToBytes(key),
      value.balance.mul(DECIMALS).toString()
    ]);

    leftoverTokenHolders.delete(key);
  });

  assert(
    leftoverTokenHolders.size === 0,
    'Token holders have not been cleared.'
  );

  // Fill in the indices with random data first.
  ChainSpecTemplate.genesis.runtime.indices.ids = Array.from(
    { length: 925 },
    () => pdKeyring.encodeAddress(pdUtil.hexToU8a(w3Util.randomHex(32)))
  );

  // Write to chain spec those that have claimed.
  claimers.forEach((value, key) => {
    const { balance, index, vested } = value;
    const encodedAddress = pdKeyring.encodeAddress(pdUtil.hexToU8a(key));

    // Put in the balane.
    ChainSpecTemplate.genesis.runtime.balances.balances.push([
      encodedAddress,
      balance.mul(DECIMALS).toString(),
    ]);

    // Put in the vesting (if it exists).
    if (vested.gt(w3Util.toBN(0))) {
      const liquid = balance.sub(vested);
      
      ChainSpecTemplate.genesis.runtime.balances.vesting.push([
        encodedAddress,
        0,
        VestingLength,
        liquid.mul(DECIMALS).toString(),
      ]);
    }

    // Put in the index.
    ChainSpecTemplate.genesis.runtime.indices.ids[index] = encodedAddress;
  });

  // For testing purposes...
  if (test) {
    ChainSpecTemplate.genesis.runtime.staking.stakers.forEach((entry) => {
      let [ account1, account2, reqBalance ] = entry;
      ChainSpecTemplate.genesis.runtime.balances.balances.push([
        account1,
        reqBalance
      ], [
        account2,
        reqBalance,
      ]);
    });

    const mineSudo = '5EvvwXJsJNpVuNd8u3xnYnHDTCD1bxbsY4JtRmra3mqz6hxN';
    ChainSpecTemplate.genesis.runtime.sudo.key = mineSudo;
    ChainSpecTemplate.genesis.runtime.balances.balances.push([
      mineSudo,
      10000000000,
    ]);
  }

  // This part is to replace an assigned but unclaimed indices with random addresses, to not mess up ordering.
  const idsLength = ChainSpecTemplate.genesis.runtime.indices.ids.length;
  for (let i = 0; i < idsLength; i++) {
    const { ids } = ChainSpecTemplate.genesis.runtime.indices;
    if (!ids[i]) {
      ids[i] = pdKeyring.encodeAddress(pdUtil.hexToU8a(w3Util.randomHex(32)));
    }
  }

  fs.writeFileSync(
    'kusama.json',
    JSON.stringify(ChainSpecTemplate, null, 2),
  );

  console.log('Chain specification written to kusama.json');
}
