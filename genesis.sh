#!/bin/bash

if [ -z "$AT_BLOCK" ]
then
   AT_BLOCK="8405350"
fi
if [ -z "$HTTP_ENDPOINT" ]
then
   HTTP_ENDPOINT="https://mainnet.infura.io/v3/7121204aac9a45dcb9c2cc825fb85159"
fi

yarn genesis --endpoint $HTTP_ENDPOINT --atBlock $AT_BLOCK
python3 post_processing.py
rm kusama.tmp.json
