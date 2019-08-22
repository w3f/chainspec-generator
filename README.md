# kusama-genesis-spec

CLI for generating the Kusama chain specification from Ethereum state.

## Running

Clone this repository to your desired environment and install the dependencies using `yarn`. You will also need Python3.

```zsh
$ git clone https://github.com/w3f/kusama-genesis-spec.git
$ cd kusama-genesis-spec
$ yarn
```

### Generating the Genesis Chain Specification

In order to generate the `kusama.json` chain specification from Ethereum state, run the command like so (this will use the default values for the environmental variables):

```zsh
$ chmod +x genesis.sh
$ ./genesis.sh
```

In order to generate using the Ethereum state from a _specific_ block, run the command with the `AT_BLOCK` environmental variable. In order to use an archive node at a given HTTP endpoint, use the `HTTP_ENDPOINT` variable.

```zsh
$ HTTP_ENDPOINT=<URL> AT_BLOCK=<ETH_BLOCK_NUM> ./genesis.sh
```

### Verifying the Initial State of a Chain

Once you have started a chain using the `kusama.json` chain specification, you can also use this tool to verify that the state initialized properly.

```zsh
$ yarn verify --atBlock 8405350
```
