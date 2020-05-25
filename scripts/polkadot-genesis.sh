#!/bin/bash

if [ -z "$AT_BLOCK" ]
then
   AT_BLOCK="latest"
fi
if [ -z "$HTTP_ENDPOINT" ]
then
   HTTP_ENDPOINT="https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159"
fi
if [ -z "$CLAIMS_CONTRACT" ]
then
   CLAIMS_CONTRACT="0xa2CBa0190290aF37b7e154AEdB06d16100Ff5907"
fi

yarn genesis --endpoint $HTTP_ENDPOINT --atBlock $AT_BLOCK\
 --claims $CLAIMS_CONTRACT --tmpOutput polkadot.tmp.json\
 --template templates/polkadot.template.json --test\
 --statements SAFT_accounts.csv

python3 post_processing.py polkadot.tmp.json

# Clean up
rm polkadot.tmp.json
