import fs from "fs";
import path from "path";
import { zip } from "zip-a-folder";
import extract from "extract-zip";
import { uploadRecursive } from "./uploadFile.js";
import { downloadSingleFile } from "./downloadFile.js";

export async function commitSrc(
  client,
  srcDir,
  remoteDir,
  nameProject,
  text,
  configFtp
) {
  const tempLocalZip = "__tmpZip__";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const latestVersion = await findLatestVersionRemote(client, remoteDir, nameProject , true);
    const version = incrementVersion(latestVersion);


  if (!fs.existsSync(srcDir)) {
    console.error(`❌ Directory ${srcDir} does not exist`);
  }

  if (!fs.existsSync(tempLocalZip)) {
    fs.mkdirSync(tempLocalZip, { recursive: true });
  }

  // scrivo notes.txt se text non è vuoto
  console.log(text);
  let noteFilePath = null;
  if (text && text.trim() !== "") {
    noteFilePath = path.join(srcDir, "notes.txt");
    fs.writeFileSync(noteFilePath, text, "utf8");
  }

  const backupFileName = `/${nameProject}_${timestamp}_V${version}.zip`;
  const zipLocalPath = path.join(tempLocalZip, backupFileName);

  try {
    await zip(srcDir, zipLocalPath);

    await uploadRecursive(client, tempLocalZip, remoteDir, {
      pathIgnore: [],
    }, configFtp);

    console.log("✅ commit completed successfully.");
  } catch (err) {
    console.error("❌ Error during this commit:", err.message);
  } finally {
    // rimuovo il notes.txt se creato
    if (noteFilePath && fs.existsSync(noteFilePath)) {
      fs.unlinkSync(noteFilePath);
    }

    fs.rmSync(tempLocalZip, { recursive: true, force: true });
    console.log("🧹 Temporary folders removed.");
  }
}

export async function pullVersion(client, remoteDir, srcDir, nameProject, version = null, clean = false) {
  try {
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    } else if (clean) {
      fs.rmSync(srcDir, { recursive: true, force: true });
      fs.mkdirSync(srcDir, { recursive: true });
    }

    let remotePath;

    if (version === null) {
      remotePath = await findLatestVersionRemote(client, remoteDir, nameProject, false);
      if (!remotePath) {
        console.error("❌ No commit found for this project.");
        return null;
      }
    } else {
      const regex = new RegExp(
        `^${nameProject}_\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z_V${version}\\.zip$`
      );

      const list = await client.list(remoteDir);
      const match = list.find((item) => item.isFile && regex.test(item.name));

      if (!match) {
        console.error(`❌ No backup found for version ${version}.`);
        return null;
      }

      remotePath = path.posix.join(remoteDir, match.name);
    }

    const localZip = path.join(srcDir, path.basename(remotePath));

    await downloadSingleFile(client, localZip, remotePath);

    // Estrazione con extract-zip
    await extract(localZip, { dir: path.resolve(srcDir) });

    fs.unlinkSync(localZip);

    console.log(`✅ Version ${version ?? "latest"} downloaded and unzipped successfully into ${srcDir}.`);
    return srcDir;

  } catch (err) {
    console.error("❌ Error while downloading/unzipping version:", err.message);
    return null;
  }
}

export async function findLatestVersionRemote(
  client,
  remoteDir,
  nameProject,
  isNeededVersion = false
) {
  const regex = new RegExp(
    `^${nameProject}_\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z_V(\\d+_\\d+)\\.zip$`
  );

  const list = await client.list(remoteDir);
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
  const latest = backupFiles[0];

  if (isNeededVersion) {
    const match = latest.path.match(/_V(\d+_\d+)\.zip$/);
    return match ? match[1] : null;
  }

  return latest.path;
}

export function incrementVersion(version, type = "minor") {
  if(version == null)
    return `${1}_${0}`;

  if (!/^\d+_\d+$/.test(version)) {
    throw new Error(`Invalid version format: ${version}`);
  }

  let [major, minor] = version.split("_").map(Number);

  if (type === "major") {
    major += 1;
    minor = 0;
  } else {
    minor += 1;
  }

  return `${major}_${minor}`;
}