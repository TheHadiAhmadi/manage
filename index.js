#!/usr/bin/env node

import {execSync} from 'child_process'
import inquirer from "inquirer";
import { createProject } from "./commands/create.js";
import { deleteProject } from "./commands/delete.js";
import { setDomain } from "./commands/setDomain.js";
import { startProject } from "./commands/start.js";
import { updateProject } from "./commands/update.js";
import { generateNginxConfig } from './utils.js'

const main = async () => {
  console.log("Welcome to the Node.js Project Manager!");

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Create a new project", value: "create" },
        { name: "Start a project", value: "start" },
        { name: "Update an existing project", value: "update" },
        { name: "update domain of a project", value: "set-domain" },
        { name: "Generate nginx config", value: "update-nginx" },
        { name: "Delete a project", value: "delete-project" },
      ],
    },
  ]);

  if (action === "create") {
    await createProject();
  } else if (action === "start") {
    await startProject();
  } else if (action === "update") {
    await updateProject();
  } else if (action == 'update-nginx') {
    await generateNginxConfig();
    execSync('./nginx.sh', {stdio: 'inherit'})
  } else if (action == 'set-domain') {
    await setDomain();
  } else if (action == 'delete-project') {
    await deleteProject();
  }
};

main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
