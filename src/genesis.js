const pdKeyring = require('@polkadot/keyring');
const pdUtil = require('@polkadot/util');
const fs = require('fs');
const Web3 = require('web3');

const w3Util = (new Web3()).utils;

/// Ethereum Mainnet Contracts
const DOTAllocationIndicator = '0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907';
const KusamaClaims = '0x9a1B58399EdEBd0606420045fEa0347c24fB86c2';

/// Contract ABIs
const { abi: ClaimsABI } = require('../build/contracts/Claims.json');
const { abi: FrozenTokenABI } = require('../build/contracts/FrozenToken.json');

/// Infura Endpoint
const InfuraMainnet = 'https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159';

/// Chain Specification Template
const ChainSpecTemplate = require('../template.json');

/// Vesting Length (six months for Kusama)
const VestingLength = 6 * 30 * 24 * 60 * (60 / 1.65); // 1.65s slot times

/// Frozen Token Admin (used for accounting).
const FrozenTokenAdmin = '0x00b46c2526e227482e2EbB8f4C69E4674d262E75';

/** Functions */

const assert = (condition, errMsg) => {
  if (!condition) throw new Error(errMsg);
}

const getW3 = (providerURL = InfuraMainnet) => {
  const provider = new Web3.providers.HttpProvider(providerURL);
  return new Web3(provider);
}

const getClaimsContract = (w3, claimsABI = ClaimsABI, address = KusamaClaims) => {
  return new w3.eth.Contract(claimsABI, address);
}

const getFrozenTokenContract = (w3, frozenTokenABI = FrozenTokenABI, address = DOTAllocationIndicator) => {
  return new w3.eth.Contract(frozenTokenABI, address);
}

const getTokenHolderData = async (frozenTokenContract, claimsContract, atBlock = 'latest') => {
  // this maps EthereumAddress => { balance, index, pubKey, vested }
  const tokenHolders = new Map();

  // This pulls all Transfer events from FrozenToken in order to do balances accounting.
  (await frozenTokenContract.getPastEvents('Transfer', {
    fromBlock: '0',
    toBlock: atBlock,
  })).forEach((event) => {
    const { from, to, value } = event.returnValues;

    if (tokenHolders.has(from)) {
      // We've seen this sending address before.
      const oldData = tokenHolders.get(from);
      const newBalance = oldData.balance.sub(w3Util.toBN(value));
      const newData = Object.assign(oldData, {
        balance: newBalance,
      });

      tokenHolders.set(from, newData);
    } else {
      assert(from === FrozenTokenAdmin, 'Seen a new sender that is not admin.');

      tokenHolders.set(from, {
        balance: w3Util.toBN(10000000000).sub(w3Util.toBN(value)),
        index: 0,
        pubKey: '',
        vested: w3Util.toBN(0),
      });
    }

    if (tokenHolders.has(to)) {
      // We've seen this recipient address before.
      const oldData = tokenHolders.get(to);
      const newBalance = oldData.balance.add(w3Util.toBN(value));
      const newData = Object.assign(oldData, {
        balance: newBalance,
      });

      tokenHolders.set(to, newData);
    } else {
      // First time we've seen this recipient.
      tokenHolders.set(to, {
        balance: w3Util.toBN(value),
        index: 0,
        pubKey: '',
        vested: w3Util.toBN(0),
      });
    }
  });

  // This pulls all the Claimed events to get public keys and indices.
  (await claimsContract.getPastEvents('Claimed', {
    fromBlock: '0',
    toBlock: atBlock,
  })).forEach((event) => {
    const { eth, idx, dot } = event.returnValues;
    
    assert(
      tokenHolders.has(eth),
      `Accounting Error: Claimed account ${eth} not found having balance.`
    );

    const oldData = tokenHolders.get(eth);

    assert(
      !oldData.pubKey,
      `Claim Error: Account ${eth} already registered with a public key.`
    );

    const newData = Object.assign(oldData, {
      index: Number(idx),
      pubKey: dot,
    });

    tokenHolders.set(eth, newData);
  });

  // This pulls all Vested events to get the correct vesting amounts.
  (await claimsContract.getPastEvents('Vested', {
    fromBlock: '0',
    toBlock: atBlock,
  })).forEach((event) => {
    const { eth, amount } = event.returnValues;

    assert(
      tokenHolders.has(eth),
      `Accounting Error: Account ${eth} not found having balance.`
    );

    const oldData = tokenHolders.get(eth);

    assert(
      oldData.vested.isZero(),
      `Vesting Error: Account ${eth} already found with vested balance.`
    );

    const newData = Object.assign(oldData, {
      vested: w3Util.toBN(amount),
    });

    tokenHolders.set(eth, newData);
  });

  return tokenHolders;
}

const getClaimers = (tokenHolders) => {
  // We will delete entries from the leftoverTokenHolders
  // map when we discover they've made a claim.
  const leftoverTokenHolders = tokenHolders;

  // Separate those who made a claimed from those that did not.
  // For the claimers Map, we shed the Ethereum address and use the
  //  x25519 public key as the key. 
  const claimers = new Map();

  tokenHolders.forEach((value, key) => {
    const { balance, index, pubKey, vested } = value;

    if (pubKey) {
      leftoverTokenHolders.delete(key);
      if (claimers.has(pubKey)) {
        // A claim has already been made to this pubKey, must augment the
        // balance and vested amounts. Uses the lower of the indices.
        const oldData = claimers.get(pubKey);

        const newData = {
          balance: oldData.balance.add(balance),
          index: oldData.index > index ? index : oldData.index,
          vested: oldData.vested.add(vested),
        };

        claimers.set(pubKey, newData);
      } else {
        // New entry to claimers map.
        claimers.set(pubKey, {
          balance,
          index,
          vested,
        });
      }
    }
  });

  return { leftoverTokenHolders, claimers };
}

const generateGenesis = async (cmd) => {
  const { atBlock, test } = cmd;

  const w3 = getW3();
  const kusamaClaims = getClaimsContract(w3);
  const dotAllocationIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(dotAllocationIndicator, kusamaClaims, atBlock);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders);

  // Write to chain spec any accounts that still need to claim.
  leftoverTokenHolders.forEach((value, key) => {
    ChainSpecTemplate.genesis.runtime.claims.claims.push([
      w3Util.hexToBytes(key),
      value.balance.toNumber()
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
      balance.toNumber(),
    ]);

    // Put in the vesting (if it exists).
    if (vested.gt(w3Util.toBN(0))) {
      const liquid = balance.sub(vested);
      
      ChainSpecTemplate.genesis.runtime.balances.vesting.push([
        encodedAddress,
        0,
        VestingLength,
        liquid.toNumber(),
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
      1000000000000000000000000000000,
    ]);
  }

  fs.writeFileSync(
    'kusama.json',
    JSON.stringify(ChainSpecTemplate, null, 2) 
  );

  console.log('Chain specification written to kusama.json');
}


module.exports = generateGenesis;
