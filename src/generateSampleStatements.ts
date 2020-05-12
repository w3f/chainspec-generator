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

const generateSampleStatements = async (opts: any) => {
  const { output, endpoint, claims, atBlock } = opts;

  const w3 = getW3(endpoint);
  const claimsContract = getClaimsContract(w3, claims);
  const dotAllocationIndicator = getFrozenTokenContract(w3);

  const tokenHolders = await getTokenHolderData(
    dotAllocationIndicator,
    claimsContract,
    atBlock
  );

  const [holders, claimers] = getClaimers(tokenHolders);

  const statements = ["Default", "Alternative"];

  let counter = 0;
  for (const [ethAddr] of holders) {
    fs.appendFileSync(output, `${ethAddr},${statements[counter % 2]}\n`);
    counter++;
  }

  for (const [pubkey] of claimers) {
    const encoded = Keyring.encodeAddress(Util.hexToU8a(pubkey), 0);
    fs.appendFileSync(output, `${encoded},${statements[counter % 2]}\n`);
    counter++;
  }
};

export default generateSampleStatements;
