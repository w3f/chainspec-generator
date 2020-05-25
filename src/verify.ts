import { ApiPromise, WsProvider } from "@polkadot/api";
import * as Keyring from "@polkadot/keyring";
import * as Util from "@polkadot/util";
import * as fs from "fs";
import Web3 from "web3";

import {
  getW3,
  getClaimsContract,
  getFrozenTokenContract,
  getTokenHolderData,
  getClaimers,
} from "./helpers";

const w3Util = new Web3().utils;

const Decimals = 10 ** 9;
const VestingLength = w3Util.toBN(Math.ceil(24 * 30 * 24 * 60 * (60 / 6)));

const getApi = (endpoint: string): Promise<ApiPromise> => {
  const provider = new WsProvider(endpoint);

  return ApiPromise.create({
    provider,
  });
};

const validateBalanceAndVesting = async (w3: any, api: any, holders: Map<string, any>) => {
  const toBN = w3.utils.toBN;
  let counter = 0;
  for (const holder of holders) {
    const { balance, index, vested } = holder[1];
    // query chain data
    const [claim, vesting] = await Promise.all([
      api.query.claims.claims(holder[0]),
      api.query.claims.vesting(holder[0])
    ]);
    const balStr = balance.mul(toBN(Decimals)).toString();
    // check whether the balance is the same
    if (claim.toString() !== balStr) {
      console.log('Ethereum address:', holder[0]);
      throw `Claims error: Got ${claim.toString()} expected ${balStr}`;
    }
    if (vested.gt(toBN(0))) {
      // console.log(vesting.toJSON());
      const vJson = vesting.toJSON() as any;
      const amount = toBN(vJson[0]);
      // check whether the vesting amount is the same
      const perBlock = vested.mul(toBN(Decimals)).divRound(VestingLength);
      if (vested.mul(toBN(Decimals)).toString() !== amount.toString()) {
        throw `Mismatch: expected ${vested
          .mul(toBN(Decimals))
          .toString()} but got ${amount.toString()}`;
      }
      const rPerBlock = toBN(vJson[1]);
      if (perBlock.toString() !== rPerBlock.toString()) {
        if (perBlock.sub(rPerBlock).gt(toBN(1))) {
          throw `Mismatch (perBlock): expected ${perBlock.toString()} but got ${rPerBlock.toString()}`;
        }
      }
    }
    counter++;
    console.log(`OK ${holder[0]}`);
  }
  return counter;
}

const verify = async (cmd: any) => {
  const { atBlock, claims, endpoint } = cmd;

  console.log(`Verifying the new chain state against the Ethereum contracts.`);

  const api = await getApi(endpoint);

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  console.log(`Connected to ${chain} using ${nodeName} v${nodeVersion}.`);

  console.log("Fetching data from Ethereum.");
  const w3 = getW3();
  const toBN = w3.utils.toBN;
  const dotClaims = getClaimsContract(w3, claims);
  const alloIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(alloIndicator, dotClaims);

  const [holders, claimers] = getClaimers(tokenHolders);

  /// Check the statements.
  let statementsArray: string[] = [];
  fs
  .readFileSync("SAFT_accounts.csv", { encoding: "utf-8" })
  .split("\n")
  .forEach((line: any) => {
    const [ethAddr, dotAddr] = line.split(",");
    if (dotAddr) statementsArray.push(dotAddr);
    if (ethAddr.startsWith("0x")) statementsArray.push(ethAddr);
  })
  
  for (const addr of statementsArray) {
    if (addr.startsWith("0x")) {
      const statementKind = await api.query.claims.signing(addr);
      if (!statementKind.toString()) {
        const claim = await api.query.claims.claims(addr);
        if (claim.toString()) {
          throw `Found claim for ${addr} but one shouldn't exist.`
        }
      } else {
        if (statementKind.toString() !== "Alternative") {
          throw `${addr} should be SAFT but is not.`
        }
      }
    }
    if (addr.startsWith("1")) {
      const ethAddr = await api.query.claims.preclaims(addr);
      if (ethAddr.toString()) { 
        const statementKind = await api.query.claims.signing(ethAddr.toString());
        if (statementKind.toString() !== "Alternative") {
          throw `${addr} should be SAFT but is not. Statement kind: ${statementKind.toString()}`
        }
      }
    }
  }

  const numOfSuccessAddrs = await validateBalanceAndVesting(w3, api, holders);

  let counter = 0;
  for (const [pubkey, claimer] of claimers) {
    const { balance, index, vested } = claimer;
    const encoded = Keyring.encodeAddress(Util.hexToU8a(pubkey), 0);

    const preclaim = await api.query.claims.preclaims(encoded);
    
    if (statementsArray.indexOf(encoded) === -1) {
      // check it's a regular statement.
      const statementKind = await api.query.claims.signing(preclaim.toString());
      if (statementKind.toString() !== "Default") {
        // The eth address should be in the statements array then.
        let found = false;
        for (const addr of statementsArray) {
          if (addr.toLowerCase() === preclaim.toString().toLowerCase()) found = true;
          else if (addr == preclaim.toString()) found = true;
        }
        if (!found) {
          throw `${encoded} should have regular statement but has something else. Has: ${statementKind.toString()} | Preclaim: ${preclaim.toString()}`;
        }
      } 
    } 
    
    if (
      preclaim.toString().toLowerCase() !== claimer.ethAddress.toLowerCase()
    ) {
      throw `Preclaim mismatch: Expected ${
        claimer.ethAddress
      } but got ${preclaim.toString()} (Polkadot Address: ${encoded})`;
    }

    const claim = await api.query.claims.claims(claimer.ethAddress);

    if (claim.toString() !== balance.mul(toBN(Decimals)).toString()) {
      throw `Balance (Claim) Mismatch: Expected ${balance.mul(
        toBN(Decimals)
      )} but got ${claim.toString()}`;
    }

    const indexResult = await api.query.indices.accounts(index);
    const account = (indexResult.toJSON() as any)[0];
    if (account !== encoded) {
      throw `Index mismatch: Expected ${encoded} but got ${account}`;
    }

    if (vested.gt(toBN(0))) {
      const vesting = await api.query.claims.vesting(claimer.ethAddress);
      const vJson = vesting.toJSON() as any;
      const amount = toBN(vJson[0]);

      const perBlock = vested.mul(toBN(Decimals)).divRound(VestingLength);
      if (vested.mul(toBN(Decimals)).toString() !== amount.toString()) {
        throw `Mismatch: expected ${vested
          .mul(toBN(Decimals))
          .toString()} but got ${amount.toString()}`;
      }

      const rPerBlock = toBN(vJson[1]);
      if (perBlock.toString() !== rPerBlock.toString()) {
        if (perBlock.sub(rPerBlock).gt(toBN(1))) {
          throw `Mismatch (perBlock): expected ${perBlock.toString()} but got ${rPerBlock.toString()}`;
        }
      }
    }

    counter++;
    console.log(`OK: ${encoded}`);
  }

  /// Check the number of accounts in storage.
  const accounts = await api.query.system.account.keys();
  if (accounts.length === 2) {
    console.log(
      "FOUND TWO ACCOUNTS. Are you running the test version of the script?"
    );
  } else {
    throw `FOUND ${accounts.length} ACCOUNTS. Was this expected?`;
  }
  
  /// Check stakers in storage.
  const validators = await api.query.session.validators();
  if (validators.length === 6) {
    console.log(
      "Are you running for the Polkadot soft launch?"
    );
  } else if (validators.length === 1) {
    console.log("FOUND ONE VALIDATOR. Are you running the test version of the script?");
  } else {
    throw `FOUND ${validators.length} validators. Was this expected?`;
  }

  console.log("ALL ALTERNATIVE STATEMENTS CHECK OUT")
  console.log(`Number of the ethereum addresses "validateBalanceAndVesting" passed: ${numOfSuccessAddrs}.`);
  console.log(`Number of polkadot addresses passed: ${counter}`);

  console.log(`ALL OK`);
  process.exit(0);
};

export default verify;
