import { randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import externalResources from "@softvisio/utils/external-resources";
import * as phc from "@softvisio/utils/phc";
import { require } from "@softvisio/utils/utils";

const ID = {
        "argon2d": 0,
        "argon2i": 1,
        "argon2id": 2,
    },
    VERSIONS = new Set( [ 16, 19 ] ),
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
    { "hash": bindingsHash } = require( resource.getResourcePath( "argon2.node" ) ),
    generateSalt = promisify( randomBytes ),
    maxMemoryCost = 2 ** 32 - 1,
    maxTimeCost = 2 ** 32 - 1,
    maxParallelism = 255,
    maxKeyidLength = 8,
    maxDataLength = 32,
    minSaltLength = 8,
    maxSaltLength = 48, // 2 ** 32 - 1
    minHashLength = 12,
    maxHashLength = 64;

export const DEFAULT = Object.freeze( {
    "id": "argon2id",
    "version": 19,
    "memoryCost": 65_536,
    "timeCost": 3,
    "parallelism": 4,
    "saltLength": 16,
    "hashLength": 32,
} );

export async function createHash ( password, { id, version, memoryCost, timeCost, parallelism, salt, saltLength, hashLength, keyId, data, raw } = {} ) {
    id ||= DEFAULT.id;
    if ( ID[ id ] == null ) throw "Id is not valid";

    version = Number( version || DEFAULT.version );
    if ( !VERSIONS.has( version ) ) throw "Version is not valid";

    memoryCost = Number( memoryCost || DEFAULT.memoryCost );
    if ( memoryCost < 1 || memoryCost > maxMemoryCost ) throw "Memory cost value is not valid";

    timeCost = Number( timeCost || DEFAULT.timeCost );
    if ( timeCost < 1 || timeCost > maxTimeCost ) throw "Time cost value is not valid";

    parallelism = Number( parallelism || DEFAULT.parallelism );
    if ( parallelism < 1 || parallelism > maxParallelism ) throw "Parallelism value is not valid";

    keyId ||= Buffer.allocUnsafe( 0 );
    if ( !( keyId instanceof Buffer ) || keyId.length > maxKeyidLength ) throw "Key id value is not valid";

    data ||= Buffer.allocUnsafe( 0 );
    if ( !( data instanceof Buffer ) || data.length > maxDataLength ) throw "Data value is not valid";

    saltLength = Number( saltLength || DEFAULT.saltLength );
    if ( saltLength < minSaltLength || saltLength > maxSaltLength ) throw "Salt length value is not valid";

    hashLength = Number( hashLength || DEFAULT.hashLength );
    if ( hashLength < minHashLength || hashLength > maxHashLength ) throw "Hash length value is not valid";

    salt ||= await generateSalt( saltLength );
    if ( !( salt instanceof Buffer ) || salt.length < minSaltLength || salt.length > maxSaltLength ) throw "Salt is not valid";

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
        "secret": keyId,
        data,
    } );

    if ( raw ) return hash;

    return phc.toPhc( {
        id,
        version,
        "params": {
            "m": memoryCost,
            "t": timeCost,
            "p": parallelism,
            "data": data.length
                ? data
                : undefined,
        },
        salt,
        hash,
    } );
}

export async function verifyHash ( digest, password, { version, memoryCost, timeCost, parallelism, keyId } = {} ) {
    const parsed = phc.fromPhc( digest, {
        "defaultParams": {
            "v": Number( version || DEFAULT.version ),
            "m": memoryCost || DEFAULT.memoryCost,
            "t": timeCost || DEFAULT.timeCost,
            "p": parallelism || DEFAULT.parallelism,
        },
    } );

    if ( ID[ parsed.id ] == null ) return false;

    version = parsed.version;
    if ( !VERSIONS.has( version ) ) throw "Version is not valid";

    memoryCost = parsed.params.m;
    if ( memoryCost < 1 || memoryCost > maxMemoryCost ) throw "Memory cost value is not valid";

    timeCost = parsed.params.t;
    if ( timeCost < 1 || timeCost > maxTimeCost ) throw "Time cost value is not valid";

    parallelism = parsed.params.p;
    if ( parallelism < 1 || parallelism > maxParallelism ) throw "Parallelism value is not valid";

    keyId ||= Buffer.allocUnsafe( 0 );
    if ( !( keyId instanceof Buffer ) || keyId.length > maxKeyidLength ) throw "Key id value is not valid";

    const params = {
        "password": password instanceof Buffer
            ? password
            : Buffer.from( password ),
        "type": ID[ parsed.id ],
        "version": version,
        "m": memoryCost,
        "t": timeCost,
        "p": parallelism,
        "salt": parsed.salt,
        "hashLength": parsed.hash.length,
        "secret": keyId,
        "data": parsed.data
            ? Buffer.from( parsed.data, "base64" )
            : Buffer.allocUnsafe( 0 ),
    };

    return timingSafeEqual( await bindingsHash( params ), parsed.hash );
}

export function needsRehash ( digest, { id, version, memoryCost, timeCost, parallelism } = {} ) {
    id ||= DEFAULT.id;
    version = Number( version || DEFAULT.version );
    memoryCost = Number( memoryCost || DEFAULT.memoryCost );
    timeCost = Number( timeCost || DEFAULT.timeCost );
    parallelism = Number( parallelism || DEFAULT.parallelism );

    const parsed = phc.fromPhc( digest, {
        "decodeNumbers": false,
        "saltEncoding": null,

        // "defaultParams": {
        //     "v": version,
        //     "m": memoryCost,
        //     "t": timeCost,
        //     "p": parallelism,
        // },
    } );

    if ( id !== parsed.id ) return false;
    if ( version !== parsed.version ) return false;
    if ( memoryCost !== Number( parsed.params?.m ) ) return false;
    if ( timeCost !== Number( parsed.params?.t ) ) return false;
    if ( parallelism !== Number( parsed.params?.p ) ) return false;

    return true;
}
