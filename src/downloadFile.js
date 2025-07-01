// lib/downloadFile.js

import fs from "fs";
import path from "path";

export async function downloadDirectoryFromRemotePath(
  client,
  localPath,
  remotePath
) {
  try {
    console.log(`🚀 Starting download from "${remotePath}" to "${localPath}"...`);
    await client.ensureDir(remotePath);
    await client.cd(remotePath);
    await downloadRecursive(client, localPath, remotePath);
    console.log("✅ Download completed successfully.");
  } catch (err) {
    console.error("❌ Error during download:", err.message);
  }
}

export async function downloadRecursive(client, localDir, remoteDir) {
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const entries = await client.list(remoteDir);

  for (const entry of entries) {
    const localEntryPath = path.join(localDir, entry.name);
    const remoteEntryPath = path.posix.join(remoteDir, entry.name);

    if (entry.isDirectory) {
      if (!fs.existsSync(localEntryPath)) {
        fs.mkdirSync(localEntryPath);
      }
      await downloadRecursive(client, localEntryPath, remoteEntryPath);
    } else if (entry.isFile) {
      console.log(`⬅️  Downloading file: ${remoteEntryPath}`);
      await client.downloadTo(localEntryPath, remoteEntryPath);
    }
  }
}

export async function downloadRecursiveNoBackup(
  client,
  localPath,
  remotePath,
  pathIgnore
) {
  await fs.promises.mkdir(localPath, { recursive: true });
  const entries = await client.list(remotePath);

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
    if (Array.isArray(pathIgnore) && pathIgnore.length > 0)
      if (pathIgnore.includes(entry.name)) {
        console.log(
          `⏭️  Skipping folder "${entry.name}" because it is listed in BackupPathIgnore`
        );
        continue;
      }

    const localEntryPath = path.join(localPath, entry.name);
    const remoteEntryPath = path.posix.join(remotePath, entry.name);

    if (entry.isDirectory) {
      await downloadRecursive(client, localEntryPath, remoteEntryPath);
    } else {
      await client.downloadTo(localEntryPath, remoteEntryPath);
      console.log(`⬇️  Downloaded file ${remoteEntryPath}`);
    }
  }
}

export async function downloadSingleFile(client, localPath, remotePath) {
  try {
    console.log(`⬇️  Downloading file: ${remotePath} -> ${localPath}`);
    
    // Create the local directory if it does not exist
    const localDir = path.dirname(localPath);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    
    await client.downloadTo(localPath, remotePath);
    console.log(`✅ File downloaded: ${localPath}`);
  } catch (err) {
    console.error(`❌ Error during file download:`, err.message);
    throw err;
  }
}