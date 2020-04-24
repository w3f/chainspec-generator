import * as Keyring from "@polkadot/keyring";
import * as Util from "@polkadot/util";
import * as fs from "fs";
import Web3 from "web3";

import {
  assert,
  getW3,
  getClaimsContract,
  getFrozenTokenContract,
  getTokenHolderData,
  getClaimers,
} from "./helpers";

const w3Util = new Web3().utils;

// Vesting Length is twenty-four months on Polkadot.
// NOTE: Assumes 6 second block times.
const VestingLength = w3Util.toBN(Math.ceil(24 * 30 * 24 * 60 * (60 / 6)));

const Decimals = 10 ** 9;

const generateGenesis = async (cmd: any) => {
  const { atBlock, claims, endpoint, template, test, tmpOutput } = cmd;
  const chainspec = JSON.parse(
    fs.readFileSync(template, { encoding: "utf-8" })
  );

  const w3 = getW3(endpoint);
  const claimsContract = getClaimsContract(w3, claims);
  const dotAllocationIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(
    dotAllocationIndicator,
    claimsContract,
    atBlock
  );

  const [holders, claimers] = getClaimers(tokenHolders);

  for (const [ethAddr, holder] of holders) {
    const { balance, vested } = holder;

    holders.delete(ethAddr);

    if (vested.gt(w3Util.toBN(0))) {
      const perBlock = vested
        .mul(w3Util.toBN(Decimals))
        .divRound(VestingLength);
      chainspec.genesis.runtime.claims.vesting.push([
        ethAddr,
        [vested.toNumber(), perBlock.toNumber(), 0],
      ]);
    }

    chainspec.genesis.runtime.claims.claims.push([ethAddr, balance.toNumber()]);
  }

  assert(holders.size === 0, "Holders should be cleared.");

  for (const [pubkey, claimer] of claimers) {
    // Always should have a pubkey if we've made it this far.
    if (!pubkey) {
      throw `No pubkey, ${JSON.stringify(claimer)}`;
    }

    const { balance, index, vested } = claimer;
    const encoded = Keyring.encodeAddress(Util.hexToU8a(pubkey), 0);

    // if (encoded == "12dyU6JpyKv44fp6EkDNTrkZqnqSvxWvJoCUM3q3hqaBEYGv") {
    // This is the sudo allocation, move it to the current sudo's balance.
    // chainspec.genesis.runtime.balances.balances.push(["", balance]);
    // }

    chainspec.genesis.runtime.balances.balances.push([
      encoded,
      balance.toNumber(),
    ]);

    if (vested.gt(w3Util.toBN(0))) {
      const liquid = balance.sub(vested);

      chainspec.genesis.runtime.vesting.vesting.push([
        encoded,
        0,
        VestingLength.toNumber(),
        liquid.toNumber(),
      ]);
    }

    chainspec.genesis.runtime.indices.indices.push([index, encoded]);
  }

  if (test) {
    chainspec.genesis.runtime.balances.balances.push(
      ["5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY", 100000000000000],
      ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 100000000000000]
    );
    chainspec.genesis.runtime.staking.stakers.push([
      "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
      "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      100000000000000,
      "Validator",
    ]);
    chainspec.genesis.runtime.session.keys.push([
      "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
      "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
      {
        grandpa: "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu",
        babe: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        im_online: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        parachain_validator: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        authority_discovery: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      },
    ]);
  }

  fs.writeFileSync(tmpOutput, JSON.stringify(chainspec, null, 2));
  console.log(`Written to ${tmpOutput}`);
};

export default generateGenesis;
