#!/bin/bash

yarn genesis --endpoint $HTTP_ENDPOINT --atBlock $AT_BLOCK "$@"
python3 post_processing.py
rm kusama.tmp.json
