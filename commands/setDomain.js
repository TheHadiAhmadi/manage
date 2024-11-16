import inquirer from 'inquirer';
import path from 'path';
import { execSync } from 'child_process'
import { BASE_DIR, loadProjectsConfig, saveProjectsConfig } from "../utils.js";


export const setDomain = async () => {
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
  