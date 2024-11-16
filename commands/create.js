
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import 'dotenv/config'
import { execSync } from 'child_process'
import { BASE_DIR, loadProjectsConfig, saveProjectsConfig } from "../utils.js";

const getUniquePort = () => {
    const ports = loadProjectsConfig().map(x => x.port);

    let port = 3000;

    while (ports.includes(port)) {
        port++;
    }
    return port;
};

// Start interactive CLI
export const createProject = async () => {
    // Ask for repository details
    const { repository, projectName, buildOption } = await inquirer.prompt([
        {
            type: "input",
            name: "repository",
            message: "Enter the GitHub repository (e.g., user/repo):",
            validate: (input) => (input ? true : "Repository cannot be empty!"),
        },
        {
            type: "input",
            name: "projectName",
            message: "Enter name of the project (defaults to repository name):",
            validate: (input) => true,
        },
        {
            type: "list",
            name: "buildOption",
            message: "What should we do about building the project?",
            choices: [
                { name: "Yes, run the build command (npm run build)", value: "yes" },
                { name: "No, skip the build step", value: "no" },
            ],
            default: "no",
        },
    ]);

    const repoName = path.basename(repository);
    projectName ??= repoName;

    const projectDir = path.join(BASE_DIR, projectName);

    if (fs.existsSync(projectDir)) {
        console.error(`Project already exists at ${projectDir}.`);
        process.exit(1);
    }

    // Clone the repository
    console.log("Cloning repository...");
    try {
        execSync(`git clone --depth 1 https://github.com/${repository}.git ${projectDir}`, {
            stdio: "inherit",
        });
    } catch (err) {
        console.error("Failed to clone repository. Please check the repository URL.");
        process.exit(1);
    }

    // Navigate to project directory
    process.chdir(projectDir);

    // Install dependencies
    console.log("Installing dependencies...");
    try {
        execSync("npm install", { stdio: "inherit" });
    } catch (err) {
        console.error("Failed to install dependencies. Please check your npm setup.");
        process.exit(1);
    }

    // Assign a unique port
    const port = getUniquePort();
    console.log(`Assigned port: ${port}`);

    const projects = loadProjectsConfig()

    projects.push({
        name: projectName,
        port,
        buildOption,
        certbot: {}
    })

    saveProjectsConfig(projects)

    console.log(`Project ${repoName} is created successfully!`);
    console.log(`you need to run this command again and start project.`);
};
