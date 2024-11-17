
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process'
import { BASE_DIR, loadProjectsConfig, NGINX_CONFIG_FILE, saveProjectsConfig } from "../utils.js";

export const deleteProject = async () => {
    const { projectName } = await inquirer.prompt([
        {
            type: "list",
            name: "projectName",
            message: "Select the project to delete:",
            choices: loadProjectsConfig().map(x => ({name: `${x.name} (${x.port})`, value: x.name})),
        }
    ]);

    const projectDir = path.join(BASE_DIR, projectName);
    if (!fs.existsSync(projectDir)) {
        console.error(`Project ${projectName} not found.`);
        process.exit(1);
    }

    // Stop the pm2 application
    console.log("Stopping the project with pm2...");
    try {
        execSync(`pm2 stop "${projectName}"`, { stdio: "inherit" });
        execSync(`pm2 delete "${projectName}"`, { stdio: "inherit" });
    } catch (err) {
        console.error("Failed to stop the project with pm2.");
        process.exit(1);
    }

    // Delete the project directory
    console.log(`Deleting project ${projectName}...`);
    try {
        fs.rmdirSync(projectDir, { recursive: true });
    } catch (err) {
        console.error("Failed to delete project directory.");
        process.exit(1);
    }

    saveProjectsConfig(projects.filter(x => x.name !== projectName))
    console.log(`Project ${projectName} has been deleted.`);
};

