import * as Keyring from "@polkadot/keyring";
import * as Util from "@polkadot/util";
import * as fs from "fs";

import {
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

  let counter = 0;
  for (const [ethAddr] of holders) {
    if (counter % 2 === 1) {
      fs.appendFileSync(output, `${ethAddr},\n`);
    }
    counter++;
  }

  for (const [pubkey, claimer] of claimers) {
    if (counter % 2 === 1) {
      const encoded = Keyring.encodeAddress(Util.hexToU8a(pubkey), 0);
      fs.appendFileSync(output, `${claimer.ethAddress},${encoded}\n`);
    }
    counter++;
  }
};

export default generateSampleStatements;
