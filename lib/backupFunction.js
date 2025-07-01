// lib/backupFuction.js

import fs from "fs";
import path from "path";
import { zip } from "zip-a-folder";
import inquirer from "inquirer";
import { uploadRecursive } from "./uploadFile.js";
import { downloadRecursiveNoBackup } from "./downloadFile.js";

export async function backupDirectory(
  client,
  nameProject,
  sourcePath,
  targetPath,
  backupPathIgnore = [],
  configFtp
) {
  const tempLocal = "__tmp__";
  const tempLocalZip = "__tmpZip__";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  // Crea cartella temporanea se non esiste
  if (!fs.existsSync(tempLocal)) {
    fs.mkdirSync(tempLocal, { recursive: true });
  }
  if (!fs.existsSync(tempLocalZip)) {
    fs.mkdirSync(tempLocalZip, { recursive: true });
  }

  const backupFileName = `/backup_${nameProject}_${timestamp}.zip`;

  const zipLocalPath = path.join(tempLocalZip, backupFileName);

  if (!targetPath || targetPath.trim() === "") {
    targetPath = sourcePath;
  }

  try {
    console.log(`⬇️  Downloading from ${sourcePath} to temporary local...`);
    await downloadRecursiveNoBackup(client, tempLocal, sourcePath, backupPathIgnore);

    console.log(`📦 Creating ZIP: ${zipLocalPath}`);
    await zip(tempLocal, zipLocalPath);

    console.log(`⬆️  Uploading ZIP to ${targetPath}`);
    await uploadRecursive(client, tempLocalZip, targetPath, {
      pathIgnore: [],
    } , configFtp);
    console.log("✅ Backup completed successfully.");
  } catch (err) {
    console.error("❌ Error during backup:", err.message);
  } finally {
    fs.rmSync(tempLocal, { recursive: true, force: true });
    fs.rmSync(tempLocalZip, { recursive: true, force: true });
    console.log("🧹 Temporary folders removed.");
  }
}

export async function clearRemoteDirectoryWithBackup(
  client,
  projectConfiguration
) {
  const configPath = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  const targetPath = configPath.pathProject;
  const backupPath = configPath.backupPath;
  const backupPathIgnore = configPath.backupPathIgnore;

  const { confirmClear } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmClear",
      message: `⚠️ Are you sure you want to completely empty the folder "${targetPath}"?`,
      default: false,
    },
  ]);

  if (!confirmClear) {
    console.log("❌ Operation cancelled.");
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
    console.log("❌ Operation cancelled.");
    return;
  }

  const { doBackup } = await inquirer.prompt([
    {
      type: "confirm",
      name: "doBackup",
      message: "Would you like to create a backup before proceeding?",
      default: true,
    },
  ]);

  if (doBackup) {
    console.log("🔄 Creating backup...");
    await backupDirectory(
      client,
      configPath.nameProject,
      targetPath,
      backupPath || "",
      backupPathIgnore
    );
  }

  const entries = await client.list(targetPath);

  for (const entry of entries) {
    if (
      entry.isDirectory &&
      /^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/i.test(entry.name)
    ) {
      console.log(
        `⏭️  Skipping folder "${entry.name}" because it matches the backup_timestamp pattern`
      );
      continue;
    }

    const entryPath = path.posix.join(targetPath, entry.name);
    try {
      if (entry.isDirectory) {
        await client.removeDir(entryPath);
        console.log(`🗑️  Folder deleted: ${entryPath}`);
      } else {
        await client.remove(entryPath);
        console.log(`🗑️  File deleted: ${entryPath}`);
      }
    } catch (err) {
      console.error(`❌ Error deleting "${entryPath}":`, err.message);
    }
  }

  console.log("✅ Folder successfully emptied.");
}

export async function findLatestBackupRemote(
  client,
  remoteDir,
  nameProject
) {
  const list = await client.list(remoteDir);
  const regex = new RegExp(
        `^backup_${nameProject}_\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z.zip$`
      )
      const backupFiles = list
    .filter((item) => item.isFile && regex.test(item.name))
    .map((item) => ({
      path: path.posix.join(remoteDir, item.name),
      modifiedAt: item.modifiedAt,
    }));

  if (backupFiles.length === 0) {
    return null;
  }

  backupFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return backupFiles[0].path;
}

export function randomString(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
