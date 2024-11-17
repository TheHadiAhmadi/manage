import fs from 'fs';
import path from 'path';
import 'dotenv/config'

export const BASE_DIR = process.env.BASE_DIR ?? "/home/hadi/pm2-apps/";
export const NGINX_CONFIG_FILE = path.join(BASE_DIR, "nginx.conf");
export const PROJECTS_FILE = path.join(BASE_DIR, "projects.json");

// Ensure the BASE_DIR exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// Function to load projects configuration from the JSON file
export const loadProjectsConfig = () => {
  if (fs.existsSync(PROJECTS_FILE)) {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  }
  return [];
};

// Function to save projects configuration to the JSON file
export const saveProjectsConfig = (projects) => {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    console.log(`Projects configuration saved to ${PROJECTS_FILE}`);
  } catch (err) {
    console.error("Failed to save projects configuration.");
    process.exit(1);
  }
};

// Function to generate nginx.conf based on the projects configuration
export const generateNginxConfig = async () => {
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

    if (project.certbot?.certificate_path) {
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
export const getUniquePort = () => {
  const usedPorts = JSON.parse(fs.readFileSync(PORT_FILE));
  let port = 3000;

  while (usedPorts.includes(port)) {
    port++;
  }

  usedPorts.push(port);
  fs.writeFileSync(PORT_FILE, JSON.stringify(usedPorts));
  return port;
};
