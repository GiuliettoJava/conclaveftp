#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { connectFtp } from "./src/connectFtp.js";
import {
  validationJson,
  validationFtpConfig,
  validationPathProject,
  automaticJsonIgnore
} from "./src/jsonValidation.js";
import { browse, browsePathForIgnore } from "./src/browsePathFtp.js";
import { browseLocal } from "./src/browsPathLocal.js";
import { uploadDirectoryToRemotePath } from "./src/uploadFile.js";
import { downloadRecursiveNoBackup } from "./src/downloadFile.js";
import {
  backupDirectory,
  clearRemoteDirectoryWithBackup,
} from "./src/backupFunction.js";
import { undoFunction } from "./src/restoreFuction.js";
import { browseIgnoreList } from "./src/browseArray.js";

const program = new Command();
const __dirname = process.cwd();

const ftpPathConfiguration = path.join(process.cwd(), "configFtp.json");
const projectConfiguration = path.join(process.cwd(), "pathProject.json");

if (!fs.existsSync(ftpPathConfiguration)) {
  console.log("❌ File configFtp.json not found, creating...");
  const defaultFtpConfig = {
    host: "",
    user: "",
    password: ""
  };
  fs.writeFileSync(ftpPathConfiguration, JSON.stringify(defaultFtpConfig, null, 2), "utf8");
}

if (!fs.existsSync(projectConfiguration)) {
  console.log("❌ File pathProject.json not found, creating...");
  const defaultProjectConfig = {
    nameProject: "",
    pathProject: "",
    backupPath: "",
    buildPath: "",
    pathIgnore: [],
    backupPathIgnore: []
  };
  fs.writeFileSync(projectConfiguration, JSON.stringify(defaultProjectConfig, null, 2), "utf8");
}

const configFTP = JSON.parse(fs.readFileSync(ftpPathConfiguration, "utf8"));
const configProject = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));

automaticJsonIgnore(projectConfiguration);

program
  .name("ftcli")
  .description("A tool for navigating and saving paths on an FTP server")
  .version("1.0.0");

program
  .command("config")
  .description("Configure the FTP connection")
  .action(async () => {
    configFTP.host = configFTP.user = configFTP.password = "";
    fs.writeFileSync(
      ftpPathConfiguration,
      JSON.stringify(configFTP, null, 2),
      "utf8"
    );
    await validationJson(configFTP, ftpPathConfiguration);
    let client;
    try {
      client = await connectFtp(configFTP);
      console.log("✅ Data is valid; FTP connection successful!");
    } catch (err) {
      console.error("❌ FTP connection error:", err.message);
      console.log("Please try setting the configuration data again.\n");
    } finally {
      if (client) {
        client.close();
      }
    }
  });

program
  .command("cpath")
  .description("Set the project path")
  .action(async () => {
    await validationFtpConfig(configFTP);
    let client;
    try {
      client = await connectFtp(configFTP);
      console.log("✅ FTP connection established. Starting navigation...");
      await browse(client, configProject, projectConfiguration);
    } catch (err) {
      console.error("❌ Error:", err.message || err);
    } finally {
      if (client) {
        client.close();
        console.log("🛑 Connection closed.");
      }
    }
  });

program
  .command("bpath")
  .description("Set the standard project path to be uploaded to the server")
  .action(async () => {
    const selectedLocalPath = await browseLocal(
      process.cwd(),
      projectConfiguration,
      true
    );
    if (selectedLocalPath) {
      console.log("📁 Selected directory:", selectedLocalPath);
    }
  });

program
  .command("expath")
  .description("Exclude paths from the project push")
  .action(async () => {
    const selectedLocalPath = await browseLocal(
      process.cwd(),
      projectConfiguration
    );
    if (selectedLocalPath) {
      console.log("📁 Selected directory:", selectedLocalPath);
    }
  });

program
  .command("edignore")
  .description("Modify the ignore list")
  .action(async () => {
    await browseIgnoreList(projectConfiguration, false);
  });

program
  .command("exbackuppath")
  .description("Exclude paths from the project backup")
  .action(async () => {
    await validationFtpConfig(configFTP);
    await validationPathProject(configProject);
    let client;
    try {
      client = await connectFtp(configFTP);
      console.log("✅ FTP connection established. Starting navigation...");
      await browsePathForIgnore(
        client,
        configProject.pathProject,
        projectConfiguration
      );
    } catch (err) {
      console.error("❌ Error:", err.message || err);
    } finally {
      if (client) {
        client.close();
        console.log("🛑 Connection closed.");
      }
    }
  });

program
  .command("edbackupignore")
  .description("Modify the backup ignore list")
  .action(async () => {
    await browseIgnoreList(projectConfiguration, true);
  });

program
  .command("push")
  .description("Upload your project to the configured folder. Optionally, specify a path from which to upload files with -p <pathname>.")
  .option("-p, --path <path>", "Folder path to push")
  .option("-d, --delete" ,"delete the directory before push")
  .action(async (options) => {
    await validationFtpConfig(configFTP);
    await validationPathProject(configProject);
    const finalPath = options.path
      ? path.resolve(__dirname, options.path)
      : configProject.buildPath == "" ? __dirname : path.resolve(__dirname, configProject.buildPath);
    if(!fs.existsSync(finalPath)){
      console.error(`❌ The path "${finalPath}" doesn't exist`);
      process.exit();
    }
    let deletePath = options.delete ? true : false;
    let client;
    try {
      client = await connectFtp(configFTP);
      if(deletePath)  await clearRemoteDirectoryWithBackup(client, projectConfiguration , false) ;
      await uploadDirectoryToRemotePath(client, finalPath, configProject, configFTP);
    } catch (err) {
      console.error("❌ Error during push:", err.message);
    } finally {
      if (client) client.close();
    }
  });

program
  .command("get")
  .description("Download the entire directory from the configured path. Optionally, specify a path with -p <pathname> where the files should be downloaded.")
  .option("-p, --path <path>", "Folder path to download")
  .action(async (options) => {
    await validationFtpConfig(configFTP);
    await validationPathProject(configProject);
    const finalPath = options.path
      ? path.resolve(__dirname, options.path)
      : __dirname;
    let client;
    try {
      client = await connectFtp(configFTP);
      await downloadRecursiveNoBackup(
        client,
        finalPath,
        configProject.pathProject,
        []
      );
    } catch (err) {
      console.error("❌ Error in FTP connection:", err.message);
    } finally {
      if (client) client.close();
    }
  });

program
  .command("backup")
  .description("Create a backup in the selected backup folder")
  .action(async () => {
    await validationFtpConfig(configFTP);
    await validationPathProject(configProject);
    let client;
    try {
      client = await connectFtp(configFTP);
      await backupDirectory(
        client,
        configProject.nameProject,
        configProject.pathProject,
        configProject.backupPath,
        configProject.backupPathIgnore,
        configFTP
      );
    } catch (err) {
      console.error("❌ Error during backup:", err.message);
    } finally {
      if (client) client.close();
    }
  });

program
  .command("delete")
  .description("Delete all present folders except for backup folders")
  .action(async () => {
    await validationFtpConfig(configFTP);
    await validationPathProject(configProject);
    let client;
    try {
      client = await connectFtp(configFTP);
      await clearRemoteDirectoryWithBackup(client, projectConfiguration);
    } catch (err) {
      console.error("❌ Error during deletion:", err.message);
    } finally {
      if (client) client.close();
    }
  });

program
  .command("restore")
  .description("Clear everything from the project path and reload the latest available backup")
  .action(async () => {
    await validationFtpConfig(configFTP);
    await validationPathProject(configProject);
    let client;
    try {
      client = await connectFtp(configFTP);
      await undoFunction(client, projectConfiguration , configFTP);
    } catch (err) {
      console.error("❌ Error during undo:", err.message);
    } finally {
      if (client) client.close();
    }
  });

program.parse(process.argv);
