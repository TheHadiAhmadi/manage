#!/usr/bin/env node

import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_DIR = "/home/hadi/github/TheHadiAhmadi/manage/pm2-apps/";
const NGINX_CONFIG_FILE = path.join(BASE_DIR, "nginx.conf");
const PROJECTS_FILE = path.join(BASE_DIR, "projects.json");

// Ensure the BASE_DIR exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// Function to load projects configuration from the JSON file
const loadProjectsConfig = () => {
  if (fs.existsSync(PROJECTS_FILE)) {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  }
  return [];
};

// Function to save projects configuration to the JSON file
const saveProjectsConfig = (projects) => {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    console.log(`Projects configuration saved to ${PROJECTS_FILE}`);
  } catch (err) {
    console.error("Failed to save projects configuration.", err);
    process.exit(1);
  }
};

// Function to generate nginx.conf based on the projects configuration
const generateNginxConfig = async () => {
  const projects = loadProjectsConfig();
  let nginxConfig = '';

  for (const project of projects) {
    let serverBlock = `
    server {
      listen ${project.port};
      server_name ${project.domain};
    
      location / {
        proxy_pass http://localhost:${project.port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
      }
    `;

    if (project.ssl) {
      // Add SSL configuration if ssl is true in config
      serverBlock += `
  listen 443 ssl;
  ssl_certificate ${project.certbot.certificate_path};
  ssl_certificate_key ${project.certbot.certificate_key_path};
`;
    }

    serverBlock += '\n}\n';
    nginxConfig += serverBlock;
  }

  // Save the generated nginx.conf
  try {
    fs.writeFileSync(NGINX_CONFIG_FILE, nginxConfig);
    console.log(`nginx.conf updated successfully at ${NGINX_CONFIG_FILE}`);
  } catch (err) {
    console.error("Failed to write nginx.conf.");
    process.exit(1);
  }
};


// Get a unique port
const getUniquePort = () => {
  const ports = loadProjectsConfig().map(x => x.port);

  let port = 3000;

  while (ports.includes(port)) {
    port++;
  }
  // fs.writeFileSync(PORT_FILE, JSON.stringify(ports));
  return port;
};

// Start interactive CLI
const createProject = async () => {
  console.log("Welcome to the Node.js Project Manager!");

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

  if (buildOption === "yes") {
    console.log("Building project...");
    try {
      execSync("npm run build", { stdio: "inherit" });
    } catch (err) {
      console.error("Failed to build project. Please check your npm setup.");
      process.exit(1);
    }
  }

  // Save build option for future updates
  // const buildConfig = JSON.parse(fs.readFileSync(BUILD_CONFIG_FILE));
  // buildConfig[projectName] = { buildOption };
  // fs.writeFileSync(BUILD_CONFIG_FILE, JSON.stringify(buildConfig, null, 2));

  // Assign a unique port
  const port = getUniquePort();
  console.log(`Assigned port: ${port}`);


  const projects = loadProjectsConfig()

  projects.push({
      "name": projectName,
      "port": port,
      "certbot": {}
  })

  saveProjectsConfig(projects)
  // Start the project with pm2
  console.log("Starting the project with pm2...");
  try {
    execSync(`pm2 start npm --name "${projectName}" -- start -- --port=${port}`, {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Failed to start the project with pm2.");
    process.exit(1);
  }

  console.log(`Project ${repoName} is now hosted successfully on port ${port}.`);
};

const updateProject = async () => {
  console.log("Updating an existing project...");

  const projects = getProjectList();

  if (projects.length === 0) {
    console.log("No projects found to update.");
    return;
  }

  const { selectedProject } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedProject",
      message: "Select a project to update:",
      choices: projects,
    },
  ]);

  const projectDir = path.join(BASE_DIR, selectedProject);
  const buildConfig = JSON.parse(fs.readFileSync(BUILD_CONFIG_FILE));
  const buildOption = buildConfig[selectedProject]?.buildOption || "no";

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
  if (buildOption === "yes") {
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


const setDomain = async () => {
  const { projectName, domainName } = await inquirer.prompt([
    {
      type: "list",
      name: "projectName",
      message: "Select the project to set domain for:",
      choices: loadProjectsConfig().map(x => `${x.name} (${x.port})`),
    },
    {
      type: "input",
      name: "domainName",
      message: "Enter the domain name (e.g., example.com):",
      validate: (input) => (input ? true : "Domain name cannot be empty!"),
    },
  ]);

  const projectDir = path.join(BASE_DIR, projectName);
  if (!fs.existsSync(projectDir)) {
    console.error(`Project ${projectName} not found.`);
    process.exit(1);
  }

  // Update nginx configuration
  console.log("Updating Nginx configuration...");
  try {
    const nginxConfig = fs.readFileSync(NGINX_CONF_PATH, "utf8");
    const updatedConfig = nginxConfig.replace(/server_name\s+[^;]+;/, `server_name ${domainName};`);
    fs.writeFileSync(NGINX_CONF_PATH, updatedConfig, "utf8");

    // Optionally restart nginx
    console.log("Restarting Nginx...");
    execSync("sudo systemctl restart nginx", { stdio: "inherit" });

    // Run certbot to generate SSL
    console.log("Generating SSL certificate with certbot...");
    try {
      execSync(`certbot --nginx -d ${domainName} --agree-tos --non-interactive --email your-email@example.com`, { stdio: "inherit" });


      // After certbot runs, update the certbot fields with the new certificate paths
      project.certbot.certificate_path = `/etc/letsencrypt/live/${domainName}/fullchain.pem`;
      project.certbot.certificate_key_path = `/etc/letsencrypt/live/${domainName}/privkey.pem`;

      // Save updated projects configuration
      saveProjectsConfig(projects);
    } catch (err) {
      console.error("Failed to generate SSL certificate.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Failed to update Nginx configuration.");
    process.exit(1);
  }

  console.log(`Domain ${domainName} has been set for project ${projectName}.`);
  await generateNginxConfig()
};


// Function to delete a project
const deleteProject = async () => {
  const { projectName, deleteNginxConfig } = await inquirer.prompt([
    {
      type: "list",
      name: "projectName",
      message: "Select the project to delete:",
      choices: loadProjectsConfig().map(x => `${x.name} (${x.port})`),
    },
    {
      type: "confirm",
      name: "deleteNginxConfig",
      message: "Do you also want to remove the Nginx configuration for this project?",
      default: false,
    },
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

  // Optionally delete the Nginx configuration
  if (deleteNginxConfig) {
    console.log("Removing Nginx configuration...");
    try {
      const nginxConfig = fs.readFileSync(NGINX_CONF_PATH, "utf8");
      const updatedConfig = nginxConfig.replace(new RegExp(`server_name\\s+${projectName}\\s*;`, 'g'), '');
      fs.writeFileSync(NGINX_CONF_PATH, updatedConfig, "utf8");

      // Optionally restart nginx
      execSync("sudo systemctl restart nginx", { stdio: "inherit" });
    } catch (err) {
      console.error("Failed to remove Nginx configuration.");
      process.exit(1);
    }
  }

  console.log(`Project ${projectName} has been deleted.`);
};


// Main menu
const main = async () => {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Create a new project", value: "create" },
        { name: "Update an existing project", value: "update" },
        { name: "Set domain to a project", value: "set-domain" },
        { name: "Delete a project", value: "delete-project" },
      ],
    },
  ]);

  if (action === "create") {
    await createProject();
  } else if (action === "update") {
    await updateProject();
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
