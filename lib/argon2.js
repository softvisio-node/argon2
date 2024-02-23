import assert from "node:assert";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { deserialize, serialize } from "@phc/format";
import externalResources from "@softvisio/utils/external-resources";
import { require } from "@softvisio/utils/utils";

const resource = await externalResources
    .add( {
        "id": "softvisio-node/argon2",
        "napi": 3,
    } )
    .check();

const { "hash": bindingsHash } = require( resource.location + "/argon2.node" );

// XXX
// const { "hash": bindingsHash } = gypBuild( __dirname );

/** @type {(size: number) => Promise<Buffer>} */
const generateSalt = promisify( randomBytes );

const argon2d = 0;
const argon2i = 1;
const argon2id = 2;

export { argon2d };
export { argon2i };
export { argon2id };

/** @enum {argon2i | argon2d | argon2id} */
const types = Object.freeze( { argon2d, argon2i, argon2id } );

/** @enum {'argon2d' | 'argon2i' | 'argon2id'} */
const names = Object.freeze( {
    [ types.argon2d ]: "argon2d",
    [ types.argon2i ]: "argon2i",
    [ types.argon2id ]: "argon2id",
} );

const defaults = Object.freeze( {
    "hashLength": 32,
    "timeCost": 3,
    "memoryCost": 1 << 16,
    "parallelism": 4,
    "type": argon2id,
    "version": 0x13,
} );

const limits = Object.freeze( {
    "hashLength": { "min": 4, "max": 2 ** 32 - 1 },
    "memoryCost": { "min": 1 << 10, "max": 2 ** 32 - 1 },
    "timeCost": { "min": 2, "max": 2 ** 32 - 1 },
    "parallelism": { "min": 1, "max": 2 ** 24 - 1 },
} );

export { limits };

/**
 * @typedef {object} Options
 * @property {number} [hashLength=32]
 * @property {number} [timeCost=3]
 * @property {number} [memoryCost=65536]
 * @property {number} [parallelism=4]
 * @property {keyof typeof names} [type=argon2id]
 * @property {number} [version=19]
 * @property {Buffer} [salt]
 * @property {Buffer} [associatedData]
 * @property {Buffer} [secret]
 */

/**
 * Hashes a password with Argon2, producing a raw hash
 *
 * @overload
 * @param {Buffer | string} password The plaintext password to be hashed
 * @param {Options & { raw: true }} options The parameters for Argon2
 * @returns {Promise<Buffer>} The raw hash generated from `plain`
 */
/**
 * Hashes a password with Argon2, producing an encoded hash
 *
 * @overload
 * @param {Buffer | string} password The plaintext password to be hashed
 * @param {Options & { raw?: boolean }} [options] The parameters for Argon2
 * @returns {Promise<string>} The encoded hash generated from `plain`
 */
/**
 * @param {Buffer | string} password The plaintext password to be hashed
 * @param {Options & { raw?: boolean }} [options] The parameters for Argon2
 */
async function hash ( password, options ) {
    var { raw, salt, ...rest } = { ...defaults, ...options };

    for ( const [ key, { min, max } ] of Object.entries( limits ) ) {
        const value = rest[ key ];
        assert( min <= value && value <= max, `Invalid ${ key }, must be between ${ min } and ${ max }.` );
    }

    salt = salt ?? ( await generateSalt( 16 ) );

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

    return serialize( {
        "id": names[ type ],
        version,
        "params": { m, t, p, ...( data.byteLength > 0 ? { data } : {} ) },
        salt,
        hash,
    } );
}

export { hash };

/**
 * @param {string} digest The digest to be checked
 * @param {Object} [options] The current parameters for Argon2
 * @param {number} [options.timeCost=3]
 * @param {number} [options.memoryCost=65536]
 * @param {number} [options.parallelism=4]
 * @returns {boolean} `true` if the digest parameters do not match the parameters in `options`, otherwise `false`
 */
function needsRehash ( digest, options = {} ) {
    const { memoryCost, timeCost, version } = { ...defaults, ...options };

    const {
        "version": v,
        "params": { m, t },
    } = deserialize( digest );

    return +v !== +version || +m !== +memoryCost || +t !== +timeCost;
}
export { needsRehash };

/**
 * @param {string} digest The digest to be checked
 * @param {Buffer | string} password The plaintext password to be verified
 * @param {Object} [options] The current parameters for Argon2
 * @param {Buffer} [options.secret]
 * @returns {Promise<boolean>} `true` if the digest parameters matches the hash generated from `plain`, otherwise `false`
 */
async function verify ( digest, password, { secret } = { "secret": Buffer.alloc( 0 ) } ) {
    const { id, ...rest } = deserialize( digest );
    if ( !( id in types ) ) {
        return false;
    }

    const {
        version = 0x10,
        "params": { m, t, p, data = "" },
        salt,
        hash,
    } = rest;

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
export { verify };
