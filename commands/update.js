
import inquirer from 'inquirer';
import path from 'path';
import { execSync } from 'child_process'
import { BASE_DIR, loadProjectsConfig, saveProjectsConfig } from "../utils.js";

export const updateProject = async () => {
  console.log("Updating an existing project...");

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
      choices: projects.map(x => ({value: x.name, name: `${x.name} (${x.port})`})),
    },
  ]);

  const projectDir = path.join(BASE_DIR, selectedProject);

  const project = projects.find(x => x.name === selectedProject)

  
  // Navigate to project directory
  process.chdir(projectDir);

  // Pull the latest code
  console.log("Pulling the latest code...");
  try {
    execSync("git pull origin main", { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to pull the latest code. Please check the repository configuration.");
    process.exit(1);
  }

  // Install dependencies
  console.log("Installing dependencies...");
  try {
    execSync("npm install", { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to install dependencies. Please check your npm setup.");
    process.exit(1);
  }

  // Run build if required
  if (project.buildOption === "yes") {
    console.log("Building project...");
    try {
      execSync("npm run build", { stdio: "inherit" });
    } catch (err) {
      console.error("Failed to build project. Please check your npm setup.");
      process.exit(1);
    }
  }

  // Restart the project with pm2
  console.log("Restarting the project with pm2...");
  try {
    execSync(`pm2 restart ${selectedProject}`, { stdio: "inherit" });
  } catch (err) {
    console.error("Failed to restart the project with pm2.");
    process.exit(1);
  }

  console.log(`Project ${selectedProject} has been updated and restarted successfully.`);
};