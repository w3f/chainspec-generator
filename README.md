# kusama-genesis-spec

CLI for generating the Kusama chain specification from Ethereum state.

## Running

Clone this repository to your desired environment and install the dependencies using `yarn`.

```zsh
$ git clone https://github.com/w3f/kusama-genesis-spec.git
$ cd kusama-genesis-spec
$ yarn
```

### Generating the Genesis Chain Specification

In order to generate the `kusama.json` chain specification from Ethereum state, run the command like so:

```zsh
$ yarn genesis
```

In order to generate using the Ethereum state from a _specific_ block, run the command with the `--atBlock <num>` option:

```zsh
$ yarn genesis --atBlock 8698698
```

### Verifying the Initial State of a Chain

Once you have started a chain using the `kusama.json` chain specification, you can also (TODO) use this tool to verify that the state initialized properly.

```zsh
$ yarn verify --atBlock 8698698
```
