import { randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import externalResources from "@softvisio/utils/external-resources";
import * as phc from "@softvisio/utils/phc";
import { require } from "@softvisio/utils/utils";

export const argon2d = 0;
export const argon2i = 1;
export const argon2id = 2;

const resource = await externalResources
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
    types = Object.freeze( { argon2d, argon2i, argon2id } ),
    names = Object.freeze( {
        [ types.argon2d ]: "argon2d",
        [ types.argon2i ]: "argon2i",
        [ types.argon2id ]: "argon2id",
    } ),
    defaults = {
        "type": argon2id,
        "version": 0x13,
        "timeCost": 3,
        "memoryCost": 1 << 16,
        "parallelism": 4,
        "saltLength": 16,
        "hashLength": 32,
    };

export async function hash ( password, options ) {
    var { raw, salt, ...rest } = { ...defaults, ...options };

    if ( rest.hashLength > 2 ** 32 - 1 ) {
        throw new RangeError( "Hash length is too large" );
    }

    if ( rest.memoryCost > 2 ** 32 - 1 ) {
        throw new RangeError( "Memory cost is too large" );
    }

    if ( rest.timeCost > 2 ** 32 - 1 ) {
        throw new RangeError( "Time cost is too large" );
    }

    if ( rest.parallelism > 2 ** 24 - 1 ) {
        throw new RangeError( "Parallelism is too large" );
    }

    salt = salt ?? ( await generateSalt( rest.saltLength ) );

    const { hashLength, secret = Buffer.alloc( 0 ), type, version, "memoryCost": m, "timeCost": t, "parallelism": p, "associatedData": data = Buffer.alloc( 0 ) } = rest;

    const hash = await bindingsHash( {
        "password": Buffer.from( password ),
        salt,
        secret,
        data,
        hashLength,
        m,
        t,
        p,
        version,
        type,
    } );

    if ( raw ) {
        return hash;
    }

    return phc.stringify( {
        "id": names[ type ],
        version,
        "params": { m, t, p, ...( data.byteLength > 0
            ? { data }
            : {} ) },
        salt,
        hash,
    } );
}

export function needsRehash ( digest, options = {} ) {
    const { id, version, memoryCost, timeCost, parallelism } = {
        ...defaults,
        ...options,
    };

    const parsed = phc.parse( digest );

    return id !== parsed.id || Number( version ) !== parsed.version || Number( memoryCost ) !== Number( parsed.m ) || Number( timeCost ) !== Number( parsed.t ) || Number( parallelism ) !== Number( parsed.p );
}

export async function verify ( digest, password, options = {} ) {
    const { id, ...rest } = phc.parse( digest );

    if ( !( id in types ) ) {
        return false;
    }

    const {
        version = 0x10,
        "params": { m, t, p, data = "" },
        salt,
        hash,
    } = rest;

    const { secret = Buffer.alloc( 0 ) } = options;

    return timingSafeEqual(
        await bindingsHash( {
            "password": Buffer.from( password ),
            salt,
            secret,
            "data": Buffer.from( data, "base64" ),
            "hashLength": hash.byteLength,
            "m": +m,
            "t": +t,
            "p": +p,
            "version": +version,
            "type": types[ id ],
        } ),
        hash
    );
}
