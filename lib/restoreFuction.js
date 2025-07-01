// lib/undoFuction.js

import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import extract from "extract-zip";
import { findLatestBackupRemote } from "./backupFunction.js";
import { downloadSingleFile } from "./downloadFile.js";
import { uploadRecursive } from "./uploadFile.js";
import { randomString } from "./backupFunction.js";

export async function undoFunction(client, projectConfiguration, configFtp) {
  const configPath = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  const targetPath = configPath.pathProject;
  let backupPath = configPath.backupPath;
  let backupPathIgnore = configPath.backupPathIgnore;

  backupPath = await findLatestBackupRemote(
    client,
    backupPath.trim() !== "" ? backupPath : targetPath,
    configPath.nameProject
  );
  if (!backupPath) {
    throw new Error("No backup file found in the remote directory.");
  }

  const { confirmClear } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmClear",
      message: `⚠️ Do you really want to completely clear the folder "${targetPath}, latest backup found: ${backupPath}"?`,
      default: false,
    },
  ]);

  if (!confirmClear) {
    console.log("❌ Operation canceled.");
    return;
  }

  let StringConferma = randomString(6);
  const { confermFromUser } = await inquirer.prompt([
    {
      name: "confermFromUser",
      type: "input",
      message: `⚠️ Please retype the string: "${StringConferma}"?`,
    },
  ]);
  if (confermFromUser != StringConferma) {
    console.log("❌ Operation canceled.");
    return;
  }

  const tempLocal = path.resolve("__tmp__");
  const tempUnZip = path.resolve("__unzip__");

  // Create temporary folders if they do not exist
  if (!fs.existsSync(tempLocal)) {
    fs.mkdirSync(tempLocal, { recursive: true });
  }
  if (!fs.existsSync(tempUnZip)) {
    fs.mkdirSync(tempUnZip, { recursive: true });
  }

  try {
    console.log(`⬇️  Downloading from ${backupPath} to temporary local folder...`);

    // Extract ZIP filename from path
    const zipFileName = path.basename(backupPath);
    const localZipPath = path.join(tempLocal, zipFileName);

    // Download the ZIP file
    await downloadSingleFile(client, localZipPath, backupPath);

    // Extract the ZIP file
    await unzipFolder(localZipPath, tempUnZip);

    console.log(`⬆️  Uploading from temporary folder to ${targetPath}...`);
    let dontUpload = [targetPath.split("/").pop()];
    dontUpload.push(...backupPathIgnore);
    await uploadRecursive(
      client,
      tempUnZip,
      targetPath,
      {
        pathIgnore: dontUpload,
      },
      configFtp
    );

    console.log("✅ Copy completed successfully.");
  } catch (err) {
    console.error("❌ Error during FTP copy:", err.message);
  } finally {
    // Clean up temporary folders
    if (fs.existsSync(tempLocal)) {
      fs.rmSync(tempLocal, { recursive: true, force: true });
    }
    if (fs.existsSync(tempUnZip)) {
      fs.rmSync(tempUnZip, { recursive: true, force: true });
    }
  }
}

export async function unzipFolder(zipPath, targetPath) {
  try {
    // Ensure target path is absolute
    const absoluteTargetPath = path.resolve(targetPath);
    await extract(zipPath, { dir: absoluteTargetPath });
    console.log(`✅ Archive extracted to: ${absoluteTargetPath}`);
  } catch (err) {
    console.error(`❌ Error during extraction:`, err.message);
    throw err;
  }
}
