#!/bin/bash

yarn genesis --endpoint $HTTP_ENDPOINT
python post_processing.py

