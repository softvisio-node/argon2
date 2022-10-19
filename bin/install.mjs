#!/usr/bin/env node

import https from "https";
import zlib from "zlib";
import fs from "fs";

const url = new URL( "https://github.com/softvisio/argon2/releases/download/data/" );

await get( url, `napi-v3-${process.platform}-${process.arch}.node` );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) await get( url, `napi-v3-linux-${process.arch}.node` );

process.exit();

async function get ( url, file ) {
    process.stdout.write( `Downloading: ${file} ... ` );

    const res = await new Promise( resolve => {
        https.get( url + file + ".gz", res => {
            if ( res.statusCode !== 302 ) return resolve();

            https.get( res.headers.location, res => {
                fs.mkdirSync( "lib/binaries", { "recursive": true } );

                res.pipe( zlib.createGunzip() )
                    .pipe( fs.createWriteStream( `lib/binaries/${file}` ) )
                    .on( "close", () => resolve( true ) )
                    .on( "error", e => resolve() );
            } );
        } );
    } );

    console.log( res ? "OK" : "FAIL" );

    if ( !res ) process.exit( 1 );
}
