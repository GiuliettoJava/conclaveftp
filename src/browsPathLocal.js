// lib/browsPathLocal.js

import fs from "fs";
import path from "path";
import inquirer from "inquirer";

export async function browseLocal(
  startDir = process.cwd(),
  projectConfiguration,
  skipFiles = false
) {
  let currentPath = path.resolve(startDir);
  const history = [];

  while (true) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    const choices = [{ name: "[❌] Close", value: "__stop", disabled: false }];

    if (!skipFiles) {
      choices.push({
        name: "[🗑️] Reset ignore list",
        value: "__reset",
        disabled: false,
      });
    }

    if (currentPath !== startDir) {
      choices.push({
        name: "[..] Go back",
        value: "__back",
        disabled: false,
      });
      if (!skipFiles) {
        choices.push({
          name: "[🚫] Ignore this directory",
          value: "__ignore",
          disabled: false,
        });
      }
    }

    if (skipFiles) {
      choices.push({
        name: "[⚙️✅] Save this path as project build",
        value: "__saveBuild",
        disabled: false,
      });
      choices.push({
        name: "[📚✅] Save this path as project source",
        value: "__saveSrc",
        disabled: false,
      });
      choices.push({
        name: "[⚙️🚫] Delete default build path",
        value: "__deleteBuild",
        disabled: false,
      });
      choices.push({
        name: "[📚🚫] Delete default source path",
        value: "__deleteSrc",
        disabled: false,
      });
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        choices.push({
          name: `📁 ${entry.name}`,
          value: { type: "dir", name: entry.name },
          disabled: false,
        });
      } else if (!skipFiles) {
        choices.push({
          name: `📄 ${entry.name}`,
          value: { type: "file", name: entry.name },
          disabled: false,
        });
      }
    }

    const { selected } = await inquirer.prompt([
      {
        type: "list",
        name: "selected",
        message: `📂 You are in: ${currentPath}\nChoose an option:`,
        choices,
        pageSize: 20,
      },
    ]);

    if (selected === "__stop") {
      return null;
    }

    if (selected === "__saveBuild") {
      await saveBuildOrSrcPath(projectConfiguration, currentPath);
      continue;
    }

    if (selected === "__deleteBuild") {
      await saveBuildOrSrcPath(projectConfiguration, "");
      continue;
    }

    if (selected === "__saveSrc") {
      await saveBuildOrSrcPath(projectConfiguration, currentPath, false);
      continue;
    }

    if (selected === "__saveSrc") {
      await saveBuildOrSrcPath(projectConfiguration, "", false);
      continue;
    }

    if (selected === "__back") {
      currentPath = history.pop() || path.parse(currentPath).root;
      continue;
    }

    if (selected === "__ignore") {
      await saveIgnorePath(projectConfiguration, currentPath);
      break;
    }

    if (selected === "__reset") {
      await resetPathIgnore(projectConfiguration);
      break;
    }

    if (selected.type === "dir") {
      history.push(currentPath);
      currentPath = path.join(currentPath, selected.name);
    } else {
      const fullPath = path.join(currentPath, selected.name);
      const { confirmIgnore } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmIgnore",
          message: `Do you really want to ignore the file "${selected.name}"?`,
          default: false,
        },
      ]);

      if (confirmIgnore) {
        await saveIgnorePath(projectConfiguration, fullPath);
      } else {
        console.log("❌ Ignore file canceled.");
      }

      await inquirer.prompt({
        type: "input",
        name: "wait",
        message: "Press enter to continue...",
      });
    }
  }
}

export async function saveIgnorePath(
  projectConfiguration,
  targetPath,
  isBackupPathIgnore = false
) {
  const configPath = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  const nameToIgnore = path.basename(targetPath);
  const ignoreKey = isBackupPathIgnore ? "backupPathIgnore" : "pathIgnore";

  if (!Array.isArray(configPath[ignoreKey])) {
    configPath[ignoreKey] = [];
  }

  if (!configPath[ignoreKey].includes(nameToIgnore)) {
    configPath[ignoreKey].push(nameToIgnore);
    fs.writeFileSync(
      projectConfiguration,
      JSON.stringify(configPath, null, 2),
      "utf8"
    );
    console.log(`✅ Added to '${ignoreKey}': "${nameToIgnore}"`);
  } else {
    console.log(`⚠️  "${nameToIgnore}" is already present in '${ignoreKey}'`);
  }
}

export async function resetPathIgnore(
  projectConfiguration,
  isBackupPathIgnore = false
) {
  const configPath = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  const ignoreKey = isBackupPathIgnore ? "backupPathIgnore" : "pathIgnore";
  configPath[ignoreKey] = [];
  fs.writeFileSync(
    projectConfiguration,
    JSON.stringify(configPath, null, 2),
    "utf8"
  );
  console.log(`✅ '${ignoreKey}' reset successfully`);
}

export async function saveBuildOrSrcPath(
  projectConfiguration,
  targetPath,
  isForBuild = true
) {
  const configPath = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  const dirName = path.basename(targetPath);

  if (isForBuild) configPath.buildPath = dirName;
  else configPath.sourcePath = dirName;

  fs.writeFileSync(
    projectConfiguration,
    JSON.stringify(configPath, null, 2),
    "utf8"
  );

  if (isForBuild)
    console.log(
      `💾 Build saved successfully! 📌 Path set: "${
        dirName ? dirName : process.cwd()
      }"`
    );
  else
    console.log(
      `💾 Source saved successfully! 📌 Path set: "${
        dirName ? dirName : process.cwd()
      }"`
    );

  process.exit();
}
