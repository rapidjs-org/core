#!/bin/bash

cd ./src/shared-memory/
node-gyp build                                                  # Compile C++ source (in-place)

cd ../../../
rm -rf ./dist/                                                  # Remove /dist directory to remove stale contents
tsc --outDir ./dist/                                            # Compile TypeScript source
cp ./src/cli/help.txt ./dist/cli/help.txt                       # Copy help message text file
cp ./src/shared-memory/build/Release/shared_memory.node ./dist/shared-memory/shared-memory.node
                                                                # Copy compilation of shared memory N-API module for access