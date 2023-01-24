#!/usr/bin/env node

import "#core/stream";
import { resolve } from "#core/utils";
import path from "path";
import GitHubApi from "#core/api/github";
import File from "#core/file";
import fs from "fs";
import zlib from "zlib";
import glob from "#core/glob";
import childProcess from "child_process";
import env from "#core/env";

env.loadUserEnv();

const REPO = "softvisio-node/argon2";
const TAG = "data";

// find uws location
const cwd = path.dirname( resolve( "argon2/package.json", import.meta.url ) );

// install argon2 deps
const res = childProcess.spawnSync( "npm", ["i"], {
    cwd,
    "shell": true,
    "stdio": "inherit",
} );
if ( res.status ) process.exit( res.status );

const gitHubApi = new GitHubApi( process.env.GITHUB_TOKEN );

const release = await gitHubApi.getReleaseByTagName( REPO, TAG );
if ( !release.ok ) process.exit( 1 );

for ( const file of glob( "lib/binding/*/*.node", { cwd, "sync": true } ) ) {
    const res = await gitHubApi.updateReleaseAsset( REPO, release.data.id, await repack( path.join( cwd, file ) ) );
    if ( !res.ok ) process.exit( 1 );
}

async function repack ( _path ) {
    const napi = path.basename( path.dirname( _path ) ),
        name = `${napi}-${process.platform}-${process.arch}.node.gz`;

    return new Promise( resolve => {
        fs.createReadStream( _path )
            .pipe( zlib.createGzip() )
            .buffer()
            .then( buffer => resolve( new File( { name, buffer } ) ) );
    } );
}
