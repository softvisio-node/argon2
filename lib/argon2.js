import externalResources from "@softvisio/utils/external-resources";
import { require } from "@softvisio/utils/utils";

const ID = {
        "argon2d": 0,
        "argon2i": 1,
        "argon2id": 2,
    },
    resource = await externalResources
        .add(
            {
                "id": "softvisio-node/argon2",
                "napi": 3,
                "caller": import.meta.url,
            },
            {
                "autoUpdate": false,
            }
        )
        .check(),
    { "hash": bindingsHash } = require( resource.getResourcePath( "argon2.node" ) );

export async function createHash ( password, { id, version, memoryCost, timeCost, parallelism, salt, hashLength, secret, data } = {} ) {
    const hash = await bindingsHash( {
        "password": password instanceof Buffer
            ? password
            : Buffer.from( password ),
        "type": ID[ id ],
        version,
        "m": memoryCost,
        "t": timeCost,
        "p": parallelism,
        salt,
        hashLength,
        secret,
        data,
    } );

    return hash;
}
