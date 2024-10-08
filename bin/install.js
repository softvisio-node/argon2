#!/usr/bin/env node

import externalResources from "@softvisio/utils/external-resources";

externalResources.add( {
    "id": "softvisio-node/argon2",
    "napi": 3,
} );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) {
    externalResources.add( {
        "id": "softvisio-node/argon2",
        "napi": 3,
        "platform": "linux",
    } );
}

const res = await externalResources.install( {
    "force": false,
} );

if ( !res.ok ) process.exit( 1 );
