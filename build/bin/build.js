#!/usr/bin/env node

import Cli from "#core/cli";
import { resolve } from "#core/utils";
import path from "path";
import ExternalResourceBuilder from "#core/external-resource-builder";
import Argon2 from "#lib/argon2";

const CLI = {
    "title": "Update resources",
    "options": {
        "force": {
            "description": "Force build",
            "default": false,
            "schema": {
                "type": "boolean",
            },
        },
    },
};

await Cli.parse( CLI );

const cwd = path.dirname( resolve( "argon2/package.json", import.meta.url ) );

const res = await ExternalResourceBuilder.build( [new Argon2( cwd )], { "force": process.cli.options.force } );

if ( !res.ok ) process.exit( 1 );
