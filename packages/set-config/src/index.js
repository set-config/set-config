#!/usr/bin/env node

import { parseArgs } from 'util';
import { getSupportedFormats } from './adapters/index.js';
import { set } from './commands/set.js';
import { get } from './commands/get.js';
import { del } from './commands/delete.js';
import { list } from './commands/list.js';
import { append } from './commands/append.js';
import { remove } from './commands/remove.js';
import { init } from './commands/init.js';
import fs from 'fs';

const commands = { set, get, delete: del, del, list, append, remove, init };

async function showHelp() {
  const formats = await getSupportedFormats();
  console.log(`set-config - Universal config file CLI

Usage:
  set-config <command> [options]

Commands:
  set <file> <path> <value>    Set a field value
  get <file> <path>            Get a field value
  delete <file> <path>          Delete a field (alias: del)
  list <file> [path]            List content at path (default: root)
  append <file> <path> <value> Append value to array
  remove <file> <path> <value> Remove value from array
  init <file> [--format]       Create new config file
  formats                      List supported formats

Supported formats:
${formats.map(f => `  - ${f}`).join('\n')}

Examples:
  set-config set opencode.json a.b.c 123
  set-config set config.yaml server.port 8080
  set-config get opencode.json a.b.c
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    await showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log(`set-config v${version}`);
    process.exit(0);
  }

  const { values, positionals } = parseArgs({
    args,
    options: { format: { type: 'string', short: 'f' } },
    allowPositionals: true,
  });

  const [commandName, ...cmdArgs] = positionals;

  if (commandName === 'formats') {
    const formats = await getSupportedFormats();
    formats.forEach(f => console.log(`  - ${f}`));
    return;
  }

  if (commandName === 'init') {
    await init(cmdArgs[0], values.format);
    return;
  }

  const command = commands[commandName];
  if (!command) {
    console.error(`✗ Unknown command: ${commandName}`);
    console.error("Run 'set-config' without arguments to see help");
    process.exit(1);
  }

  try {
    await command(...cmdArgs);
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
