import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { zip } from "zip-a-folder";
import extract from "extract-zip";
import { uploadRecursive } from "./uploadFile.js";
import { downloadSingleFile } from "./downloadFile.js";

function randomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getUniqueCleanDir(baseDir) {
  let candidate = path.resolve(baseDir, "..", "__clean__");
  while (fs.existsSync(candidate)) {
    candidate = path.resolve(baseDir, "..", `__clean__${randomCode()}`);
  }
  return candidate;
}

export async function commitSrc(
  client,
  srcDir,
  remoteDir,
  nameProject,
  text,
  configFtp,
  pathIgnore = []
) {
  const tempLocalZip = path.resolve(srcDir, "__tmpZip__");
  const cleanDir = getUniqueCleanDir(srcDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const latestVersion = await findLatestVersionRemote(
    client,
    remoteDir,
    nameProject,
    true
  );
  const version = incrementVersion(latestVersion);

  if (!fs.existsSync(srcDir)) {
    console.error(`❌ Directory ${srcDir} does not exist`);
  }

  if (!fs.existsSync(tempLocalZip)) {
    fs.mkdirSync(tempLocalZip, { recursive: true });
  }

  if (!fs.existsSync(cleanDir)) {
    fs.mkdirSync(cleanDir, { recursive: true });
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
    await copyRecursiveWithIgnore(srcDir, cleanDir, [...pathIgnore , "__tmpZip__"]);
    await zip(cleanDir, zipLocalPath);

    await uploadRecursive(
      client,
      tempLocalZip,
      remoteDir,
      {
        pathIgnore: [],
      },
      configFtp
    );

    console.log("✅ commit completed successfully.");
  } catch (err) {
    console.error("❌ Error during this commit:", err.message);
  } finally {
    // rimuovo il notes.txt se creato
    if (noteFilePath && fs.existsSync(noteFilePath)) {
      fs.unlinkSync(noteFilePath);
    }

    fs.rmSync(tempLocalZip, { recursive: true, force: true });
    fs.rmSync(cleanDir, { recursive: true, force: true });
    console.log("🧹 Temporary folders removed.");
  }
}

export async function pullVersion(
  client,
  remoteDir,
  srcDir,
  nameProject,
  version = null,
  clean = false
) {
  try {
    let remotePath;

    if (version === null) {
      remotePath = await findLatestVersionRemote(
        client,
        remoteDir,
        nameProject,
        false
      );
      if (!remotePath) {
        console.error("❌ No commit path found for this project.");
        return null;
      }
    } else {
      const regex = new RegExp(
        `^${nameProject}_\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z_V${version}\\.zip$`
      );

      const list = await client.list(remoteDir);
      const match = list.find((item) => item.isFile && regex.test(item.name));

      if (!match) {
        console.error(`❌ No commit found for version ${version}.`);
        return null;
      }

      remotePath = path.posix.join(remoteDir, match.name);
    }
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    } else if (clean) {
      cleanDirExceptFiles(srcDir, ["pathProject.json", "configFtp.json"]);
    }

    const localZip = path.join(srcDir, path.basename(remotePath));

    await downloadSingleFile(client, localZip, remotePath);

    // Estrazione con extract-zip
    await extract(localZip, { dir: path.resolve(srcDir) });

    fs.unlinkSync(localZip);

    console.log(
      `✅ Version ${
        version ?? "latest"
      } downloaded and unzipped successfully into ${srcDir}.`
    );
    return srcDir;
  } catch (err) {
    console.error("❌ Error while downloading/unzipping version:", err.message);
    return null;
  }
}

export async function findLatestVersionRemote(client, remoteDir, nameProject, isNeededVersion = false) {
  
  const regex = new RegExp(
    `^${nameProject}_\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z_V(\\d+_\\d+)\\.zip$`
  );

  function parseFileDate(name) {
    const match = name.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
    if (!match) return new Date(0);
    const iso = match[0].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
    return new Date(iso);
  }

  function parseVersion(name) {
    const match = name.match(/_V(\d+)_(\d+)\.zip$/);
    if (!match) return [0, 0];
    return [parseInt(match[1], 10), parseInt(match[2], 10)];
  }

  const list = await client.list(remoteDir);

  const backupFiles = list
    .filter(item => item.isFile && regex.test(item.name))
    .map(item => ({
      path: path.posix.join(remoteDir, item.name),
      name: item.name,
      date: parseFileDate(item.name),
      version: parseVersion(item.name)
    }));

  if (backupFiles.length === 0) return null;

  // Ordina prima per versione, poi per data
  backupFiles.sort((a, b) => {
    const [majorA, minorA] = a.version;
    const [majorB, minorB] = b.version;

    if (majorB !== majorA) return majorB - majorA;
    if (minorB !== minorA) return minorB - minorA;
    return b.date - a.date;
  });

  const latest = backupFiles[0];

  if (isNeededVersion) {
    return `${latest.version[0]}_${latest.version[1]}`;
  }

  return latest.path;
}

export function incrementVersion(version, type = "minor") {
  if (version == null) return `${1}_${0}`;

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

export async function copyRecursiveWithIgnore(
  srcDir,
  destDir,
  pathIgnore = []
) {
  try {
    // creo la cartella di destinazione con promises
    await fsPromises.mkdir(destDir, { recursive: true });

    // leggo il contenuto della cartella sorgente
    const entries = await fsPromises.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      if (pathIgnore.includes(entry.name)) {
        console.log(`❌ Ignored file: ${entry.name}`);
        continue;
      }

      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        console.log(`📁 Copying directory: ${srcPath} -> ${destPath}`);
        const ok = await copyRecursiveWithIgnore(srcPath, destPath, pathIgnore);
        if (!ok) return false;
      } else if (entry.isFile()) {
        console.log(`📄 Copying file: ${srcPath} -> ${destPath}`);
        await fsPromises.copyFile(srcPath, destPath);
      }
    }

    return true; // tutto ok
  } catch (err) {
    console.error("❌ Error during copy:", err.message);
    return false; // errore
  }
}

function cleanDirExceptFiles(dir, keepFiles = []) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    // se il file è tra quelli da preservare, salto
    if (keepFiles.includes(entry.name)) continue;

    try {
      if (entry.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else if (entry.isFile()) {
        fs.unlinkSync(entryPath);
      }
    } catch (err) {
      console.error(`❌ Failed to remove ${entryPath}: ${err.message}`);
    }
  }
}