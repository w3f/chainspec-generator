#!/bin/bash

if [ -z "$AT_BLOCK" ]
then
   AT_BLOCK="8405350"
fi
if [ -z "$HTTP_ENDPOINT" ]
then
   HTTP_ENDPOINT="https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159"
fi
if [ -z "$CLAIMS_CONTRACT" ]
then
   CLAIMS_CONTRACT="0x9a1B58399EdEBd0606420045fEa0347c24fB86c2"
fi

yarn genesis --endpoint $HTTP_ENDPOINT --atBlock $AT_BLOCK\
 --claims $CLAIMS_CONTRACT --tmpOutput kusamam.tmp.json\
 --template templates/kusama.template.json

python3 post_processing.py kusama.tmp.json

# Clean up
rm kusama.tmp.json
