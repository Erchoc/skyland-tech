#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { devCommand } from "./commands/dev.js";
import { buildCommand } from "./commands/build.js";
import { startCommand } from "./commands/start.js";
import { newCommand } from "./commands/new.js";
import { initCommand } from "./commands/init.js";

const main = defineCommand({
  meta: {
    name: "pkg",
    version: "0.1.0",
    description: "Tech article publishing framework",
  },
  subCommands: {
    dev: devCommand,
    build: buildCommand,
    start: startCommand,
    new: newCommand,
    init: initCommand,
  },
});

runMain(main);
