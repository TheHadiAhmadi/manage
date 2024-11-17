import inquirer from "inquirer";
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { BASE_DIR, loadProjectsConfig, saveProjectsConfig } from "../utils.js";

export const startProject = async () => {
    const projects = loadProjectsConfig();

    if (projects.length === 0) {
        console.log("No projects found to update.");
        return;
    }

    const { selectedProject } = await inquirer.prompt([
        {
            type: "list",
            name: "selectedProject",
            message: "Select a project to update:",
            choices: projects.map(x => ({ value: x.name, name: `${x.name} (${x.port})` })),
        },
    ]);

    const projectDir = path.join(BASE_DIR, selectedProject);

    const project = projects.find(x => x.name === selectedProject)

    // Navigate to project directory
    process.chdir(projectDir);

    if (project.buildOption === "yes") {
        console.log("Building project...");
        try {
            execSync("npm run build", { stdio: "inherit" });
        } catch (err) {
            console.error("Failed to build project. Please check your npm setup.");
            process.exit(1);
        }
    }

    // Start the project with pm2
    console.log("Starting the project with pm2...");
    try {
        execSync(`PORT=${project.port} pm2 start npm --name "${project.name}" --update-env -- start`, {
            stdio: "inherit",
        });
    } catch (err) {
        console.error("Failed to start the project with pm2.");
        process.exit(1);
    }
}
