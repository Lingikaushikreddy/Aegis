#!/bin/bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/vaulted-core
python test_compliance.py
