// lib/uploadFile.js

import fs from "fs";
import path from "path";
import { connectFtp } from "./connectFtp.js";

export async function uploadDirectoryToRemotePath(
  client,
  finalPath,
  configPath,
  ftpConfig = null
) {
  let remotePath = configPath.pathProject;

  try {
    console.log(`🚀 Starting upload from "${finalPath}" to "${remotePath}"...`);
    await client.ensureDir(remotePath);
    await client.cd(remotePath);
    await uploadRecursive(client, finalPath, remotePath, configPath, ftpConfig);
    console.log("✅ Upload completed successfully.");
    process.exit();
  } catch (err) {
    console.error("❌ Error during upload:", err.message);
  }
}

export async function uploadRecursive(client, localDir, remoteDir, configPath, ftpConfig = null) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    if (configPath.pathIgnore.includes(entry.name)) {
      console.log(`❌ Ignored file: ${entry.name}`);
      continue;
    }

    const localEntryPath = path.join(localDir, entry.name);
    const remoteEntryPath = path.posix.join(remoteDir, entry.name);

    if (entry.isDirectory()) {
      await client.ensureDir(remoteEntryPath);
      await uploadRecursive(
        client,
        localEntryPath,
        remoteEntryPath,
        configPath,
        ftpConfig
      );
    } else if (entry.isFile()) {
      console.log(`➡️  Uploading file: ${remoteEntryPath}`);

      let uploadSuccess = false;
      let lastError = null;
      let currentClient = client;

      // Try 5 times with 300ms delay
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await currentClient.uploadFrom(localEntryPath, remoteEntryPath);
          console.log(`✅ File uploaded successfully: ${remoteEntryPath.split("/").pop()}`);
          uploadSuccess = true;
          break;
        } catch (error) {
          lastError = error;

          // If client is closed and ftpConfig exists, try to reconnect
          if (error.message.includes("Client is closed") && ftpConfig && attempt < 5) {
            console.log(`🔄 Client closed, attempting to reconnect...`);
            try {
              currentClient = await connectFtp(ftpConfig);
              await currentClient.ensureDir(remoteDir);
              await currentClient.cd(remoteDir);
              console.log(`✅ Reconnection successful`);
            } catch (reconnectError) {
              console.log(`❌ Reconnection failed: ${reconnectError.message}`);
            }
          }

          if (attempt < 5) {
            console.log(`⚠️  Attempt ${attempt}/5 failed for ${remoteEntryPath.split("/").pop()}: ${error.message}. Retrying in 300ms...`);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      // Update main client if it was recreated
      if (currentClient !== client) {
        client = currentClient;
      }

      // If all attempts failed, show error but continue
      if (!uploadSuccess) {
        console.error(`❌ Error during upload of ${remoteEntryPath.split("/").pop()} after 5 attempts: ${lastError.message}`);
      }
    }
  }
}
