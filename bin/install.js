#!/usr/bin/env node

import externalResources from "@softvisio/utils/external-resources";

externalResources.add( `softvisio-node/argon2/resources/napi-v3-${process.platform}-${process.arch}.node` );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) {
    externalResources.add( `softvisio-node/argon2/resources/napi-v3-linux-${process.arch}.node`, { "location": "lib/binaries", "resolve": import.meta.url } );
}

const res = await externalResources.update( {
    "silent": false,
} );

if ( !res.ok ) process.exit( 1 );
