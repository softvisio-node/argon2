#!/usr/bin/env node

import path from "node:path";
import Cli from "#core/cli";
import ExternalResourceBuilder from "#core/external-resource-builder";
import { resolve } from "#core/utils";
import Argon2 from "#lib/argon2";

const CLI = {
    "title": "Build resources",
    "options": {
        "force": {
            "description": "force build",
            "default": false,
            "schema": {
                "type": "boolean",
            },
        },
    },
};

await Cli.parse( CLI );

const cwd = path.dirname( resolve( "argon2/package.json", import.meta.url ) );

const res = await ExternalResourceBuilder.build( [ new Argon2( cwd ) ], { "force": process.cli.options.force } );

if ( !res.ok ) process.exit( 1 );
