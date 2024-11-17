import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process'
import { generateNginxConfig, BASE_DIR, NGINX_CONFIG_FILE,loadProjectsConfig, saveProjectsConfig } from "../utils.js";


export const setDomain = async () => {
    const projects = loadProjectsConfig();
    if(projects.length == 0) {
      console.log("No projects found")

      return;
    }

    const { projectName, domainName } = await inquirer.prompt([
      {
        type: "list",
        name: "projectName",
        message: "Select the project to set domain for:",
        choices: projects.map(x => ({value: x.name, name: `${x.name} (${x.port})`})),
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
  
    const project = projects.find(x => x.name == projectName)
    // Update nginx configuration
    console.log("Updating Nginx configuration...");
    try {
      const nginxConfig = fs.readFileSync(NGINX_CONFIG_FILE, "utf8");
      const updatedConfig = nginxConfig.replace(`server_name ${project.domain};`, `server_name ${domainName};`);

      console.log(updatedConfig)
      project.domain =domainName;
      fs.writeFileSync(NGINX_CONFIG_FILE, updatedConfig, "utf8");
  
  
      // Run certbot to generate SSL
      console.log("Generating SSL certificate with certbot...");
      try {
        //execSync(`certbot --nginx -d ${domainName}`, { stdio: "inherit" });
        // Optionally restart nginx
  
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

    console.log("You should restart Nginx: ");
    console.log("\n\n\tsudo systemctl restart nginx");
    console.log(`\tcertbot --nginx -d ${domainName}\n\n`)

    execSync("./update.sh " + domainName)
  
  };
  
