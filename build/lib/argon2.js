import childProcess from "node:child_process";
import fs from "node:fs";
import { readConfigSync } from "#core/config";
import ExternalResourceBuilder from "#core/external-resource-builder";
import { glob } from "#core/glob";

export default class ExternalResource extends ExternalResourceBuilder {
    #cwd;
    #meta;

    constructor ( cwd ) {
        super( {
            "id": "softvisio-node/argon2",
            "napi": 3,
            "caller": import.meta.url,
        } );

        this.#cwd = cwd;
        this.#meta = { "argon2": "v" + readConfigSync( cwd + "/package.json" ).version };
    }

    // protected
    async _getEtag () {
        return result( 200, "argon2:" + this.#meta.argon2 );
    }

    async _build ( location ) {
        fs.copyFileSync( this.#cwd + "/prebuilds/" + process.platform + "-" + process.arch + "/argon2.glibc.node", location + "/argon2.node" );

        return result( 200 );
    }

    // XXX
    async _build1 ( location ) {
        var res = childProcess.spawnSync( "npm", [ "update" ], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );

        if ( res.status ) return result( [ 500, "npm update failed" ] );

        res = childProcess.spawnSync( "npm", [ "run", "build" ], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );

        if ( res.status ) return result( [ 500, "npm build failed" ] );

        const files = await glob( "build/**/argon2.node", { "cwd": this.#cwd } );

        if ( !files.length ) return result( [ 500, "Built results not found" ] );

        fs.copyFileSync( this.#cwd + "/" + files[ 0 ], location + "/argon2.node" );

        return result( 200 );
    }

    async _getMeta () {
        return result( 200, this.#meta );
    }
}
