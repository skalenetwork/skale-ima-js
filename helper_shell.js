// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @license
 * SKALE IMA JS
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @file helper_shell.js
 * @copyright SKALE Labs 2019-Present
 */

const child_process = require( "child_process" );

const g_strRecommendedShellPATH = "$PATH:/usr/local/bin/:/bin/:/usr/bin/"; // "$PATH:/bin/:/usr/bin/:/usr/local/bin/"

async function exec_array_of_commands( arrCommands, strWorkingDirectory, joEnv ) {
    if( ! joEnv )
        joEnv = { };
    if( ! ( "PATH" in joEnv ) )
        joEnv.PATH = g_strRecommendedShellPATH;
    if( strWorkingDirectory == null || strWorkingDirectory == undefined || typeof strWorkingDirectory != "string" || strWorkingDirectory.length == 0 )
        strWorkingDirectory = __dirname;
    const cnt = arrCommands.length;
    for( let i = 0; i < cnt; ++ i ) {
        const strCommand = "" + arrCommands[i];
        child_process.execSync(
            strCommand,
            {
                cwd: "" + strWorkingDirectory,
                stdio: "inherit", //, "shell": true, stdio: [ 0, 1, 2 ] //, "stdio": "inherit"
                env: joEnv
            } );
    }
}

async function exec_array_of_commands_safe( arrCommands, strWorkingDirectory, joEnv, countOfAttempts ) {
    if( countOfAttempts == null || countOfAttempts == undefined || countOfAttempts < 1 )
        countOfAttempts = 1;
    for( let idxAttempt = 0; idxAttempt < countOfAttempts; ++ idxAttempt ) {
        try {
            await exec_array_of_commands( arrCommands, strWorkingDirectory, joEnv );
            return;
        } catch ( err ) {
            console.log( "Error in batch command executor:, error description is: " + err.toString() );
        }
    } // for( let idxAttempt = 0; idxAttempt < countOfAttempts; ++ idxAttempt )
    process.exit( 13 );
}

module.exports = {
    exec_array_of_commands: exec_array_of_commands,
    exec_array_of_commands_safe: exec_array_of_commands_safe
};
