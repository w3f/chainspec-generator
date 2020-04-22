import BN from "bn.js";
import Web3 from "web3";

// Just a more sane wrapper for any to give some structure to Web3 types.
type Contract = any;

type TokenHolder = {
  balance: BN;
  index: number;
  pubKey: string;
  vested: BN;
  amendedTo: string;
};

type Claimer = {
  balance: BN;
  index: number;
  vested: BN;
};

const w3Util = new Web3().utils;

/// Ethereum Mainnet Contracts
const DOTAllocationIndicator = "0xb59f67A8BfF5d8Cd03f6AC17265c550Ed8F33907";
const KusamaClaims = "0x9a1B58399EdEBd0606420045fEa0347c24fB86c2";

const DotClaimsABI = [
  {
    inputs: [
      { internalType: "address", name: "_owner", type: "address" },
      { internalType: "address", name: "_allocations", type: "address" },
      { internalType: "uint256", name: "_setUpDelay", type: "uint256" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "original",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "amendedTo",
        type: "address",
      },
    ],
    name: "Amended",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "eth", type: "address" },
      { indexed: true, internalType: "bytes32", name: "dot", type: "bytes32" },
      { indexed: true, internalType: "uint256", name: "idx", type: "uint256" },
    ],
    name: "Claimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "eth", type: "address" },
      { indexed: true, internalType: "uint256", name: "idx", type: "uint256" },
    ],
    name: "IndexAssigned",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "pubkey",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newTotal",
        type: "uint256",
      },
    ],
    name: "InjectedSaleAmount",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "old", type: "address" },
      {
        indexed: true,
        internalType: "address",
        name: "current",
        type: "address",
      },
    ],
    name: "NewOwner",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "eth", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Vested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "eth", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "newTotal",
        type: "uint256",
      },
    ],
    name: "VestedIncreased",
    type: "event",
  },
  {
    constant: true,
    inputs: [],
    name: "UINT_MAX",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "allocationIndicator",
    outputs: [
      { internalType: "contract FrozenToken", name: "", type: "address" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address[]", name: "_origs", type: "address[]" },
      { internalType: "address[]", name: "_amends", type: "address[]" },
    ],
    name: "amend",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "amended",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address[]", name: "_eths", type: "address[]" }],
    name: "assignIndices",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "bytes32", name: "_who", type: "bytes32" }],
    name: "balanceOfPubkey",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "_eth", type: "address" },
      { internalType: "bytes32", name: "_pubKey", type: "bytes32" },
    ],
    name: "claim",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "claimed",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "claimedLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "claims",
    outputs: [
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "bytes32", name: "pubKey", type: "bytes32" },
      { internalType: "bool", name: "hasIndex", type: "bool" },
      { internalType: "uint256", name: "vested", type: "uint256" },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { internalType: "bytes32", name: "", type: "bytes32" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "claimsForPubkey",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "endSetUpDelay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "freeze",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "_eth", type: "address" }],
    name: "hasAllocation",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "_eth", type: "address" }],
    name: "hasClaimed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address[]", name: "_eths", type: "address[]" },
      { internalType: "uint256[]", name: "_vestingAmts", type: "uint256[]" },
    ],
    name: "increaseVesting",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "bytes32[]", name: "_pubkeys", type: "bytes32[]" },
      { internalType: "uint256[]", name: "_amounts", type: "uint256[]" },
    ],
    name: "injectSaleAmount",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "nextIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "saleAmounts",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ internalType: "address", name: "_new", type: "address" }],
    name: "setOwner",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { internalType: "address[]", name: "_eths", type: "address[]" },
      { internalType: "uint256[]", name: "_vestingAmts", type: "uint256[]" },
    ],
    name: "setVesting",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

/// Contract ABIs
import ClaimsArtifact from "../build/contracts/Claims.json";
const { abi: ClaimsABI } = ClaimsArtifact;
import FrozenTokenArtifact from "../build/contracts/FrozenToken.json";
const { abi: FrozenTokenABI } = FrozenTokenArtifact;
/// Infura Endpoint
const InfuraMainnet =
  "https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159";

/// Frozen Token Admin (used for accounting).
const FrozenTokenAdmin = "0x00b46c2526e227482e2EbB8f4C69E4674d262E75";

export const assert = (condition: boolean, errMsg: string) => {
  if (!condition) throw new Error(errMsg);
};

export const getW3 = (providerURL = InfuraMainnet): Web3 => {
  const provider = new Web3.providers.HttpProvider(providerURL);
  return new Web3(provider);
};

export const getClaimsContract = (
  w3: any,
  address = KusamaClaims,
  claimsABI = DotClaimsABI
): Contract => {
  return new w3.eth.Contract(claimsABI, address);
};

export const getFrozenTokenContract = (
  w3: any,
  frozenTokenABI = FrozenTokenABI,
  address = DOTAllocationIndicator
): Contract => {
  return new w3.eth.Contract(frozenTokenABI, address);
};

export const getTokenHolderData = async (
  frozenTokenContract: any,
  claimsContract: any,
  atBlock = "latest"
): Promise<Map<string, TokenHolder>> => {
  const tokenHolders = new Map();

  const transferEvents = await frozenTokenContract.getPastEvents("Transfer", {
    fromBlock: "0",
    toBlock: "latest",
  });

  for (const event of transferEvents) {
    const { from, to, value } = event.returnValues;

    // Deal with the sending address.
    if (tokenHolders.has(from)) {
      // We've seen this sending address before.
      const data = tokenHolders.get(from);
      const newBalance = data.balance.sub(w3Util.toBN(value));
      const newData = Object.assign(data, {
        balance: newBalance,
      });

      tokenHolders.set(from, newData);
    } else {
      // First time we've seen this sending address.
      assert(
        from === FrozenTokenAdmin,
        "Seen a new send from an account that's not the admin."
      );

      tokenHolders.set;
    }

    // Deal with the receiving address.
    if (tokenHolders.has(to)) {
      // We've seen this recipient address before.
      const data = tokenHolders.get(to);
      const newBalance = data.balance.add(w3Util.toBN(value));
      const newData = Object.assign(data, {
        balance: newBalance,
      });

      tokenHolders.set(to, newData);
    } else {
      // First time we've seen this recipient.
      tokenHolders.set(to, {
        balance: w3Util.toBN(value),
        index: 0,
        pubKey: "",
        vested: w3Util.toBN(0),
      });
    }
  }

  const claimEvents = await claimsContract.getPastEvents("Claimed", {
    fromBlock: "0",
    toBlock: atBlock,
  });

  for (const event of claimEvents) {
    const { eth, idx, dot } = event.returnValues;

    assert(
      tokenHolders.has(eth),
      `Accounting Error: ${eth} claimed but wasn't picked up as having balance.`
    );

    const data = tokenHolders.get(eth);

    assert(!data.pubKey, `Claim Error: ${eth} already has a public key.`);

    const newData = Object.assign(data, {
      index: Number(idx),
      pubKey: dot,
    });

    tokenHolders.set(eth, newData);
  }

  const vestedEvents = await claimsContract.getPastEvents("Vested", {
    fromBlock: "0",
    toBlock: "latest",
  });

  // TODO: Add search for increaseVested events.
  for (const event of vestedEvents) {
    console.log(JSON.stringify(event));
    const { eth, amount } = event.returnValues;

    if (!tokenHolders.has(eth)) {
      console.log(`Vested Error: ${eth} not picked up with a balance.`);
      continue;
    }

    const data = tokenHolders.get(eth);

    assert(data.vested.isZero(), `Vested Error: ${eth} is already vested.`);

    const newData = Object.assign(data, {
      vested: w3Util.toBN(amount),
    });

    tokenHolders.set(eth, newData);
  }

  const amendedEvents = await claimsContract.getPastEvents("Amended", {
    fromBlock: "0",
    toBlock: "latest",
  });

  for (const event of amendedEvents) {
    const { original, amendedTo } = event.returnValues;

    assert(
      tokenHolders.has(original),
      `Token holder set does not contain ${original}`
    );

    const data = tokenHolders.get(original);
    const newData = Object.assign(data, {
      amendedTo,
    });
    tokenHolders.set(original, newData);
  }

  return tokenHolders;
};

export const getClaimers = (
  tokenHolders: Map<string, TokenHolder>
): [Map<string, TokenHolder>, Map<string, Claimer>] => {
  // We will delete entries from the leftoverTokenHolders
  // map when we discover they've made a claim.
  const leftoverTokenHolders = tokenHolders;

  // Separate those who made a claimed from those that did not.
  // For the claimers Map, we shed the Ethereum address and use the
  //  x25519 public key as the key.
  const claimers = new Map();

  for (const [address, holderData] of tokenHolders) {
    const { balance, index, pubKey, vested, amendedTo } = holderData;

    if (!!pubKey) {
      leftoverTokenHolders.delete(address);
      if (claimers.has(pubKey)) {
        // A claim has already been made to this pubkey, we augment
        // the balance and vested amounts. Use the lower of the indices.
        const data = claimers.get(pubKey);

        const newData = {
          balance: data.balance.add(balance),
          index: data.index > index ? index : data.index,
          vested: data.vested.add(vested),
        };

        claimers.set(pubKey, newData);
      } else {
        // New entry to the claimers.
        claimers.set(pubKey, {
          balance,
          index,
          vested,
        });
      }
    } else if (amendedTo) {
      leftoverTokenHolders.delete(address);

      if (leftoverTokenHolders.has(amendedTo)) {
        const data = leftoverTokenHolders.get(amendedTo);
        const newBalance = data!.balance.add(balance);
        const newVested = data!.vested.add(vested);

        const newData = Object.assign(data, {
          balance: newBalance,
          vested: newVested,
        });

        leftoverTokenHolders.set(amendedTo, newData);
      } else {
        leftoverTokenHolders.set(amendedTo, {
          balance,
          vested,
          index,
          pubKey,
          amendedTo: "",
        });
      }
    }
  }

  return [leftoverTokenHolders, claimers];
};
