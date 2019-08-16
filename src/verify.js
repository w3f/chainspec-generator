const { ApiPromise, WsProvider } = require('@polkadot/api');
const pdKeyring = require('@polkadot/keyring');
const pdUtil = require('@polkadot/util');

const {
  getW3,
  getClaimsContract,
  getFrozenTokenContract,
  getTokenHolderData,
  getClaimers,
} = require('./helpers');

const getPdAPI = (endpoint) => {
  const provider = new WsProvider(endpoint);

  return ApiPromise.create({
    provider,
    types: {
      ParachainPublic: "AccountId",
      VestingSchedule: {
        locked: "Balance",
        perBlock: "Balance",
        startingBlock: "Balance",
      },
      Force: 'BlockNumber',
    }
  });
}

const lookupIndex = async (api, index, enumSetSize = 64) => {
  const set = await api.query.indices.enumSet(Math.floor(index / enumSetSize));
  const i = index % enumSetSize;
  return pdUtil.u8aToHex(set[i]);
}

module.exports = async (cmd) => {
  const { atBlock, endpoint } = cmd;

  console.log(`Verifying chain state against Ethereum state at block ${atBlock}...`);

  const api = await getPdAPI(endpoint);

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  console.log(`Connected to ${chain} using ${nodeName} v${nodeVersion}.`);

  // Get the data from Ethereum.
  const w3 = getW3();
  const kusamaClaims = getClaimsContract(w3);
  const dotAllocationIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(dotAllocationIndicator, kusamaClaims, atBlock);

  const { leftoverTokenHolders, claimers } = getClaimers(tokenHolders);

  // Now iterate through the data sets and check them against the state of the
  // newly deployed chain.
  leftoverTokenHolders.forEach(async (value, key) => {
    const { balance } = value;

    const pdClaim = await api.query.claims.claims(key);
    if (pdClaim.toString() !== balance.toString()) {
      throw new Error(`Claim Error: Got ${pdClaim.toString()} but expect ${balance.toString()}.`);
    } else {
      console.log(`Claim for ${key} checked!`);
    }
  });

  // Now checked the claimed data for three things:
  //    1. Correct balance in account.
  //    2. Corrent index of account.
  //    3. Correct vesting status and amount.
  claimers.forEach(async (value, key) => {
    const { balance, index, vested } = value;
    const encodedAddress = pdKeyring.encodeAddress(pdUtil.hexToU8a(key));

    const pdBalance = await api.query.balances.freeBalance(encodedAddress);
    if (pdBalance.toString() !== balance.toString()) {
      throw new Error(`Balance Error: Got ${pdBalance.toString()} but expected ${balance.toString()}.`);
    } else {
      console.log(`Balance for ${encodedAddress} checked!`);
    }

    const pubKey = await lookupIndex(api, index);
    if (pubKey !== key) {
      throw new Error(`Index Error: Got ${pubKey} but expected ${key}.`);
    } else {
      console.log(`Index for ${encodedAddress} checked!`);
    }

    if (vested.toNumber() > 0) {
      const pdVested = JSON.parse(
        (await api.query.balances.vesting(encodedAddress)).toString()
      );

      if (vested.toNumber() !== pdVested.locked) {
        throw new Error(`Vesting Error: Got ${pdVested.locked} but expected ${vested.toNumber()}.`);
      } else {
        console.log(`Vesting for ${encodedAddress} checked!`);
      }
    }
  });
}
