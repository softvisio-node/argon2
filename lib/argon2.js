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
    DEFAULT = {
        "id": "argon2id",
        "version": 19,
        "timeCost": 3,
        "memoryCost": 65_536,
        "parallelism": 4,
        "saltLength": 16,
        "hashLength": 32,
    },
    maxTimeCost = 2 ** 32 - 1,
    maxMemoryCost = 2 ** 32 - 1,
    maxParallelism = 255,
    maxKeyidLength = 8,
    maxDataLength = 32,
    minSaltLength = 8,
    maxSaltLength = 48, // 2 ** 32 - 1
    minHashLength = 12,
    maxHashLength = 64;

export async function hash ( password, { id, version, timeCost, memoryCost, parallelism, salt, saltLength, hashLength, keyId, data, raw } = {} ) {
    id ||= DEFAULT.id;
    if ( ID[ id ] == null ) throw "Id is not valid";

    version = Number( version || DEFAULT.version );
    if ( !VERSIONS.has( version ) ) throw "Version is not valid";

    timeCost = Number( timeCost || DEFAULT.timeCost );
    if ( timeCost < 1 || timeCost > maxTimeCost ) throw "timeCost is not valid";

    memoryCost = Number( memoryCost || DEFAULT.memoryCost );
    if ( memoryCost < 1 || memoryCost > maxMemoryCost ) throw "memoryCost is not valid";

    parallelism = Number( parallelism || DEFAULT.parallelism );
    if ( parallelism < 1 || parallelism > maxParallelism ) throw "parallelism is not valid";

    keyId ||= Buffer.allocUnsafe( 0 );
    if ( !( keyId instanceof Buffer ) || keyId.length > maxKeyidLength ) throw "keyId is not valid";

    data ||= Buffer.allocUnsafe( 0 );
    if ( !( data instanceof Buffer ) || data.length > maxDataLength ) throw "data is not valid";

    saltLength = Number( saltLength || DEFAULT.saltLength );
    if ( saltLength < minSaltLength || saltLength > maxSaltLength ) throw "saltLength is not valid";

    hashLength = Number( hashLength || DEFAULT.hashLength );
    if ( hashLength < minHashLength || hashLength > maxHashLength ) throw "hashLength is not valid";

    salt ||= await generateSalt( saltLength );
    if ( !( salt instanceof Buffer ) || salt.length < minSaltLength || salt.length > maxSaltLength ) throw "Salt is not valid";

    const hash = await bindingsHash( {
        "password": Buffer.from( password ),
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

    return phc.encode( {
        id,
        version,
        "params": {
            "m": memoryCost,
            "p": parallelism,
            "t": timeCost,
            "data": data.length
                ? data
                : undefined,
        },
        salt,
        hash,
    } );
}

export async function verify ( password, digest, { version, timeCost, memoryCost, parallelism, keyId } = {} ) {
    const parsed = phc.decode( digest );

    if ( ID[ parsed.id ] == null ) return false;

    version = Number( parsed.version || version || DEFAULT.version );
    if ( !VERSIONS.has( version ) ) throw "Version is not valid";

    timeCost = Number( parsed.params?.timeCost || timeCost || DEFAULT.timeCost );
    if ( timeCost < 1 || timeCost > maxTimeCost ) throw "timeCost is not valid";

    memoryCost = Number( parsed.params?.memoryCost || memoryCost || DEFAULT.memoryCost );
    if ( memoryCost < 1 || memoryCost > maxMemoryCost ) throw "memoryCost is not valid";

    parallelism = Number( parsed.params?.parallelism || parallelism || DEFAULT.parallelism );
    if ( parallelism < 1 || parallelism > maxParallelism ) throw "parallelism is not valid";

    keyId ||= Buffer.allocUnsafe( 0 );
    if ( !( keyId instanceof Buffer ) || keyId.length > maxKeyidLength ) throw "keyId is not valid";

    const params = {
        "password": Buffer.from( password ),
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
    timeCost = Number( timeCost || DEFAULT.timeCost );
    memoryCost = Number( memoryCost || DEFAULT.memoryCost );
    parallelism = Number( parallelism || DEFAULT.parallelism );

    const parsed = phc.decode( digest );

    return id !== parsed.id || Number( version ) !== parsed.version || Number( memoryCost ) !== Number( parsed.m ) || Number( timeCost ) !== Number( parsed.t ) || Number( parallelism ) !== Number( parsed.p );
}
