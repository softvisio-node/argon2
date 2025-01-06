#!/usr/bin/env node

import externalResources from "@softvisio/utils/external-resources";

externalResources.add(
    {
        "id": "softvisio-node/argon2",
        "napi": 3,
    },
    {
        "location": "package",
    }
);

const res = await externalResources.install( {
    "force": false,
} );

if ( !res.ok ) process.exit( 1 );
