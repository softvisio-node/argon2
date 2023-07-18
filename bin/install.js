#!/usr/bin/env node

import externalResources from "@softvisio/utils/external-resources";

externalResources.add( "softvisio-node/argon2/resources", { "napi": 3 } );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) {
    externalResources.add( "softvisio-node/argon2/resources", { "napi": 3, "platform": "linux" } );
}

const res = await externalResources.update( {
    "silent": false,
} );

if ( !res.ok ) process.exit( 1 );
