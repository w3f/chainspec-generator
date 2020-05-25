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

type Opts = {
  atBlock: string;
  claims: string;
  endpoint: string;
  template: string;
  test: boolean;
  tmpOutput: string;
  statements: string;
};

const generateGenesis = async (opts: Opts): Promise<void> => {
  const {
    atBlock,
    claims,
    endpoint,
    template,
    test,
    tmpOutput,
    statements,
  } = opts;

  const chainspec = JSON.parse(
    fs.readFileSync(template, { encoding: "utf-8" })
  );

  const statementsArray = fs
    .readFileSync(statements, { encoding: "utf-8" })
    .split("\n")
    .map((addr: string) => addr.toLowerCase());

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

    const statement =
      statementsArray.indexOf(ethAddr.toLowerCase()) === -1
        ? "Regular"
        : "Saft";

    holders.delete(ethAddr);

    if (vested.gt(w3Util.toBN(0))) {
      console.log("VESTED ETHEREUM ADDRESS")
      const perBlock = vested
        .mul(w3Util.toBN(Decimals))
        .divRound(VestingLength);
      chainspec.genesis.runtime.claims.vesting.push([
        ethAddr,
        [vested.toNumber(), perBlock.toNumber(), 0],
      ]);
    }

    chainspec.genesis.runtime.claims.claims.push([
      ethAddr,
      balance.toNumber(),
      null,
      statement,
    ]);
  }

  assert(holders.size === 0, "Holders should be cleared.");

  for (const [pubkey, claimer] of claimers) {
    // Always should have a pubkey if we've made it this far.
    if (!pubkey) {
      throw `No pubkey, ${JSON.stringify(claimer)}`;
    }

    const { balance, index, vested, ethAddress } = claimer;
    const encoded = Keyring.encodeAddress(Util.hexToU8a(pubkey), 0);

    const statement =
      statementsArray.indexOf(encoded.toLowerCase()) === -1
        ? "Regular"
        : "Saft";

    chainspec.genesis.runtime.claims.claims.push([
      ethAddress,
      balance.toNumber(),
      encoded,
      statement,
    ]);

    if (vested.gt(w3Util.toBN(0))) {
      console.log("VESTED POLKADOT ADDRESS");
      const perBlock = vested
        .mul(w3Util.toBN(Decimals))
        .divRound(VestingLength);

      chainspec.genesis.runtime.claims.vesting.push([
        ethAddress,
        [vested.toNumber(), perBlock.toNumber(), 0],
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
  process.exit(0);
};

export default generateGenesis;
