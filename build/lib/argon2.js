import ExternalResourceBuilder from "#core/external-resource-builder";
import { readConfig } from "#core/config";
import fs from "fs";
import glob from "#core/glob";
import childProcess from "node:child_process";

export default class ExternalResource extends ExternalResourceBuilder {
    #cwd;
    #meta;

    constructor ( cwd ) {
        super( {
            "id": "softvisio-node/argon2",
            "napi": 3,
            "packageRoot": import.meta.url,
        } );

        this.#cwd = cwd;
        this.#meta = { "argon2": "v" + readConfig( cwd + "/package.json" ).version };
    }

    async _getEtag () {
        return result( 200, "argon2:" + this.#meta.argon2 );
    }

    async _build ( location ) {
        const res = childProcess.spawnSync( "npm", ["run", "install"], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );

        if ( res.status ) return result( 500 );

        const files = glob( "lib/binding/*/*.node", { "cwd": this.#cwd } );

        if ( !files.length ) return result( 500 );

        fs.copyFileSync( this.#cwd + "/" + files[0], location + "/argon2.node" );

        return result( 200 );
    }

    async _getMeta () {
        return this.#meta;
    }
}
