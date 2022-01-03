#!/usr/bin/env node

import "#core/stream";
import { resolve } from "#core/utils";
import path from "path";
import GitHubApi from "#core/api/github";
import File from "#core/file";
import fs from "fs";
import zlib from "zlib";

const REPO = "softvisio/argon2";
const TAG = "data";

// find uws location
const cwd = path.dirname( resolve( "argon2/package.json", import.meta.url ) );

const gitHubApi = new GitHubApi( process.env.GITHUB_TOKEN );

const release = await gitHubApi.getReleaseByTagName( REPO, TAG );
if ( !release.ok ) process.exit( 1 );

const res = await gitHubApi.updateReleaseAsset( REPO, release.data.id, await repack( path.join( cwd, "lib/binding/napi-v3/argon2.node" ) ) );

if ( !res.ok ) process.exit( 1 );

async function repack ( _path ) {
    const name = `napi-v3-${process.platform}-${process.arch}.node.gz`;

    return new Promise( resolve => {
        fs.createReadStream( _path )
            .pipe( zlib.createGzip() )
            .buffer()
            .then( buffer => resolve( new File( { name, "content": buffer } ) ) );
    } );
}
