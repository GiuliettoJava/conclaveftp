// lib/browsePathFtp.js

import fs from "fs";
import inquirer from "inquirer";
import { saveIgnorePath, resetPathIgnore } from "./browsPathLocal.js";

export async function listDirectory(client, path) {
  try {
    return await client.list(path);
  } catch (err) {
    console.error(`❌ Error while reading ${path}:`, err.message);
    return [];
  }
}

export async function promptUserToChoose(currentPath, list, canGoBack) {
  const choices = [];
  choices.push({ name: "[❌] Close Ftp", value: "__stop" });
  if (currentPath != "/") {
    choices.push({ name: "[💾] Save Directory", value: "__save" });
    choices.push({ name: "[🗄️] Save as Backup", value: "__backup" });
    choices.push({ name: "[🖥️] Save as Source", value: "__remoteSrc" }); // <- nuova opzione
    choices.push({ name: "[➕] Create Folder", value: "__create" });
  }

  if (canGoBack) {
    choices.push({ name: "[..] Go back", value: "__back" });
  }

  list.forEach((item) => {
    const icon = item.type === 2 ? "📁" : "📄"; // 2=dir,1=file
    if (item.type === 2)
      choices.push({
        name: `${icon} ${item.name}`,
        value: item,
      });
  });

  const answer = await inquirer.prompt({
    type: "list",
    name: "selected",
    message: `You are in: ${currentPath}\nChoose an option:`,
    choices,
    pageSize: 20,
  });

  return answer.selected;
}

export async function browse(client, configProject, projectConfiguration) {
  let currentPath = "/";
  const history = [];

  while (true) {
    const list = await listDirectory(client, currentPath);
    const canGoBack = currentPath !== "/";

    const selected = await promptUserToChoose(currentPath, list, canGoBack);

    switch (selected) {
      case "__back":
        currentPath = history.pop() || "/";
        continue;

      case "__stop":
        return;

      case "__save":
        if (await savePath(currentPath, configProject, projectConfiguration)) {
          return;
        } else {
          continue;
        }

      case "__create":
        const { newFolderName } = await inquirer.prompt([
          {
            type: "input",
            name: "newFolderName",
            message:
              "Enter the name of the new folder (or type 'undo' to cancel):",
            validate: (input) =>
              input.trim() !== "" || "Name cannot be empty",
          },
        ]);

        if (newFolderName.toLowerCase() === "undo") {
          console.log("⚠️ Folder creation cancelled.");
          continue;
        }

        try {
          await client.cd(currentPath);
          await client.send("MKD " + newFolderName);
          console.log(
            `✅ Folder "${newFolderName}" successfully created in ${currentPath}`
          );
        } catch (err) {
          console.error(`❌ Error creating folder: ${err.message}`);
        }
        continue;

      case "__backup":
        if (
          await savePath(currentPath, configProject, projectConfiguration, true)
        ) {
          return;
        } else {
          continue;
        }

      case "__remoteSrc": // nuova logica per remoteSrc
        if (
          await savePath(currentPath, configProject, projectConfiguration, false, true)
        ) {
          return;
        } else {
          continue;
        }

      default:
        if (selected.type === 2) {
          history.push(currentPath);
          currentPath =
            (currentPath === "/" ? "" : currentPath) + "/" + selected.name;
        } else {
          await inquirer.prompt({
            type: "input",
            name: "continue",
            message: "Press enter to return to the list...",
          });
        }
    }
  }
}

export async function savePath(
  currentPath,
  configProject,
  projectConfiguration,
  backup = false,
  remoteSrc = false // nuovo parametro
) {
  let message;
  if (remoteSrc) {
    message = `Do you want to save \"${currentPath}\" as the remote source path?`;
  } else if (backup) {
    message = `Do you want to save \"${currentPath}\" as the backup path?`;
  } else {
    message = `Do you want to save \"${currentPath}\" as the project path?`;
  }

  const { confirmSave } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmSave",
      message,
      default: false,
    },
  ]);

  if (!confirmSave) return false;

  if (remoteSrc) {
    configProject.remoteSrc = currentPath;
    fs.writeFileSync(
      projectConfiguration,
      JSON.stringify(configProject, null, 2),
      "utf8"
    );
    console.log(
      "✅ Remote Source path: " + configProject.remoteSrc
    );
    return true;
  }

  if (!backup) {
    const { projectName } = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "What will be the project name?",
      },
    ]);

    configProject.pathProject = currentPath;
    configProject.nameProject = projectName;

    fs.writeFileSync(
      projectConfiguration,
      JSON.stringify(configProject, null, 2),
      "utf8"
    );

    console.log(
      "✅ Project name: " +
        configProject.nameProject +
        "\n📁 Project path: " +
        configProject.pathProject
    );
    return true;
  } else {
    configProject.backupPath = currentPath;
    fs.writeFileSync(
      projectConfiguration,
      JSON.stringify(configProject, null, 2),
      "utf8"
    );

    console.log(
      "✅ Project name: " +
        configProject.nameProject +
        "\n📁 Backup path: " +
        configProject.backupPath
    );
    return true;
  }
}


export async function browsePathForIgnore(
  client,
  startDir,
  projectConfiguration
) {
  let currentPath = startDir;
  const history = [];

  while (true) {
    const entries = await listDirectory(client, currentPath);

    const choices = [
      { name: "[❌] Exit", value: "__stop" },
      { name: "[🗑️] Reset ignore list", value: "__reset" },
    ];

    if (currentPath !== startDir) {
      choices.push({ name: "[..] Go back", value: "__back" });
      choices.push({ name: "[🚫] Ignore this directory", value: "__ignore" });
    }

    for (const entry of entries) {
      const icon = entry.type === 2 ? "📁" : "📄";
      choices.push({
        name: `${icon} ${entry.name}`,
        value: entry,
      });
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

    if (selected === "__stop") return;

    if (selected === "__reset") {
      await resetPathIgnore(projectConfiguration, true);
      return;
    }

    if (selected === "__ignore") {
      await saveIgnorePath(projectConfiguration, currentPath, true);
      continue;
    }

    if (selected === "__back") {
      currentPath = history.pop() || startDir;
      continue;
    }

    if (selected.type === 2) {
      history.push(currentPath);
      currentPath = currentPath.endsWith("/")
        ? currentPath + selected.name
        : currentPath + "/" + selected.name;
      continue;
    }

    // File selected
    const fullPath = currentPath.endsWith("/")
      ? currentPath + selected.name
      : currentPath + "/" + selected.name;

    const { confirmIgnore } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmIgnore",
        message: `Are you sure you want to ignore the file "${selected.name}"?`,
        default: false,
      },
    ]);

    if (confirmIgnore) {
      await saveIgnorePath(projectConfiguration, fullPath, true);
    } else {
      console.log("❌ File ignore cancelled.");
    }

    await inquirer.prompt({
      type: "input",
      name: "wait",
      message: "Press enter to continue...",
    });
  }
}
