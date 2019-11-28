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

/// Chain Specification Template
const ChainSpecTemplate = require('../template.json');

const ElapsedTime = 900000;

/// Vesting Length (six months for Kusama)
const VestingLength = Math.ceil(6 * 30 * 24 * 60 * (60 / 6)); // 6s block times

/// Seed
const Seed = w3Util.toBN(w3Util.keccak256('Kusama'));

/// Address counter
let count = 0;

module.exports = async (cmd) => {
  const { atBlock, endpoint, test } = cmd;

  const w3 = getW3(endpoint);
  const kusamaClaims = getClaimsContract(w3);
  const dotAllocationIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(dotAllocationIndicator, kusamaClaims, atBlock);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders);

  let vestedTracker = 0;

  // Write to chain spec any accounts that still need to claim.
  leftoverTokenHolders.forEach((value, key) => {
    const { balance, vested } = value;

    leftoverTokenHolders.delete(key);

    // First checks if these are supposed to be vested.
    if (vested.gt(w3Util.toBN(0))) {
      ChainSpecTemplate.genesis.runtime.claims.claims.push([
        key,
        Math.floor(balance.toNumber() / 2),
      ]);

      vestedTracker += Math.ceil(balance.toNumber() / 2);
    } else {
      ChainSpecTemplate.genesis.runtime.claims.claims.push([
        key,
        value.balance.toNumber()
      ]);
    }
  });

  assert(
    leftoverTokenHolders.size === 0,
    'Token holders have not been cleared.'
  );

  // Add the vested amounts to W3F allocation for manual delivery.
  ChainSpecTemplate.genesis.runtime.claims.claims.forEach((entry, index) => {
    if (entry[0] === '0x00b46c2526e227482e2EbB8f4C69E4674d262E75') {
      ChainSpecTemplate.genesis.runtime.claims.claims[index][1] += vestedTracker;
    }
  })

  // Fill in the indices with random data first.
  ChainSpecTemplate.genesis.runtime.indices.ids = Array.from(
    { length: 925 },
    () => {
      const addr = pdKeyring.encodeAddress(pdUtil.hexToU8a('0x' + Seed.sub(w3Util.toBN(count)).toString('hex')));
      count++;
      return addr;
    }
  );

  // Write to chain spec those that have claimed.
  claimers.forEach((value, key) => {
    const { balance, index, vested } = value;
    const encodedAddress = pdKeyring.encodeAddress(pdUtil.hexToU8a(key));

    if (encodedAddress == "5DhgKm3m7Yead8oaH7ANKhvQzAqoEexnEJTzBkqh9kYf47ou") {
      // This was the previous sudo, we take the balance for the temporary sudo.
      ChainSpecTemplate.genesis.runtime.balances.balances.push([
        "5DaRHsojFXcpUfnAGES4rEwhCa2znRzu6LwRV9ZHg1j2fYLW",
        balance.div(w3Util.toBN(2)).toNumber(),
      ]);
      ChainSpecTemplate.genesis.runtime.balances.balances.push([
        "5DhgKm3m7Yead8oaH7ANKhvQzAqoEexnEJTzBkqh9kYf47ou",
        balance.div(w3Util.toBN(2)).toNumber(),
      ]);


    } else {
      // Put in the balance.
      ChainSpecTemplate.genesis.runtime.balances.balances.push([
        encodedAddress,
        balance.toNumber(),
      ]);
    }

    // Put in the vesting (if it exists).
    if (vested.gt(w3Util.toBN(0))) {
      const liquid = balance.sub(vested);

      // Now take into account elapsed.
      const locked = balance.sub(liquid);
      const perBlock = locked.div(VestingLength);
      const alreadyVested = perBlock.mul(ElapsedTime);
      
      ChainSpecTemplate.genesis.runtime.balances.vesting.push([
        encodedAddress,
        0,
        VestingLength - ElapsedTime,
        liquid.add(alreadyVested).toNumber(),
      ]);
    }

    // Put in the index.
    ChainSpecTemplate.genesis.runtime.indices.ids[index] = encodedAddress;
  });

  // This part is to replace an assigned but unclaimed indices with random addresses, to not mess up ordering.
  const idsLength = ChainSpecTemplate.genesis.runtime.indices.ids.length;
  for (let i = 0; i < idsLength; i++) {
    const { ids } = ChainSpecTemplate.genesis.runtime.indices;
    if (!ids[i]) {
      ids[i] = pdKeyring.encodeAddress(pdUtil.hexToU8a('0x' + Seed.sub(w3Util.toBN(count)).toString('hex')));
      count++;
    }
  }

  fs.writeFileSync(
    'kusama.tmp.json',
    JSON.stringify(ChainSpecTemplate, null, 2),
  );

  console.log('Chain specification written to kusama.json');
}
