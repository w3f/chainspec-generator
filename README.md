# Genesis Chainspec Generator

CLI for generating the Polkadot and Kusama chain specification from the state of
the DOT Allocation and Claims contracts.

## Running

Clone this repository to your desired environment and install the dependencies using `yarn`. You will also need Python3.

```zsh
$ git clone https://github.com/w3f/chainspec-generator.git
$ cd chainspec-generator
$ yarn
```

### Generating the Genesis Chain Specification

In order to generate the `polkadot.json` chain specification from Ethereum state, run the command like so (this will use the default values for the environmental variables):

```zsh
$ chmod +x scripts/polkadot-genesis.sh
$ ./scripts/polkadot-genesis.sh
```

In order to generate using the Ethereum state from a _specific_ block, run the command with the `AT_BLOCK` environmental variable. In order to use an archive node at a given HTTP endpoint, use the `HTTP_ENDPOINT` variable.

```zsh
$ HTTP_ENDPOINT=<URL> AT_BLOCK=<ETH_BLOCK_NUM> ./scripts/polkadot-genesis.sh
```

### Verifying the Initial State of a Chain

Once you have started a chain using the `polkadot.json` chain specification, you can also use this tool to verify that the state initialized properly.
Make sure to have the WebSockets RPC port open on your node.

```zsh
$ yarn verify
```
