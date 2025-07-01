import fs from "fs";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

export async function validationJson(confingJson, ftpPathConfiguration) {
  if (!confingJson.host || !confingJson.user || !confingJson.password) {
    const rl = readline.createInterface({ input, output });
    console.log("Configuration file needed");
    confingJson.host = await rl.question("Enter FTP host: ");
    const port = await rl.question("Enter FTP port: ");
    confingJson.port = port === "" ? 21 : parseInt(port);
    confingJson.user = await rl.question("Enter FTP username: ");
    confingJson.password = await rl.question("Enter FTP password: ");
    rl.close();
    fs.writeFileSync(
      ftpPathConfiguration,
      JSON.stringify(confingJson, null, 2),
      "utf8"
    );
    console.log("✅ Configuration saved to", ftpPathConfiguration);
  } else {
    console.log("✅ FTP configuration valid");
  }
}

export async function validationFtpConfig(configFTP) {
  if (!configFTP.host || !configFTP.user || !configFTP.password) {
    console.log("❌ Please configure the FTP connection file");
    process.exit(1);
  }
}

export async function validationPathProject(configProject) {
  if (!configProject.nameProject || !configProject.pathProject) {
    console.log("❌ Please configure the project paths file");
    process.exit(1);
  }
}

export function automaticJsonIgnore(projectConfiguration) {
  let rewrite = false;
  const configProject = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  if (!configProject.pathIgnore.includes("pathProject.json")) {
    configProject.pathIgnore.push("pathProject.json");
    rewrite = true;
  }
  if (!configProject.pathIgnore.includes("configFtp.json")) {
    configProject.pathIgnore.push("configFtp.json");
    rewrite = true;
  }
  if(rewrite)
    fs.writeFileSync(
      projectConfiguration,
      JSON.stringify(configProject, null, 2),
      "utf8"
    ) 
}
