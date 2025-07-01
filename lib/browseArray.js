// lib\browseArray.js

import fs from "fs";
import path from "path";
import inquirer from "inquirer";

export async function browseIgnoreList(
  projectConfiguration,
  isBackupPathIgnore
) {
  const configPath = JSON.parse(fs.readFileSync(projectConfiguration, "utf8"));
  let pathToIgnore = isBackupPathIgnore
    ? configPath.backupPathIgnore
    : configPath.pathIgnore;
  if (!Array.isArray(pathToIgnore)) {
    pathToIgnore = [];
  }

  let ignoreList = [...pathToIgnore];
  let exit = false;

  while (!exit) {
    const choices = [{ name: "[❌] Exit", value: "__stop" }];

    ignoreList.forEach((name, idx) => {
      const isFile = path.extname(name) !== "" || name == ".htaccess";
      const icon = isFile ? "📄" : "📁";
      if (((!isBackupPathIgnore) && !((name == "configFtp.json" || name == "pathProject.json"))))
        choices.push({
          name: `${icon} ${name}`,
          value: { idx, name, isFile },
        });
    });

    const { selected } = await inquirer.prompt([
      {
        type: "list",
        name: "selected",
        message: `📂 Ignore (${
          isBackupPathIgnore ? "backupPathIgnore" : "pathIgnore"
        }):`,
        choices,
        pageSize: 20,
      },
    ]);

    if (selected === "__stop") {
      exit = true;
      break;
    }

    const { idx, name, isFile } = selected;

    const { confirmRemove } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmRemove",
        message: `🔥 Do you want to remove the ${
          isFile ? "file" : "folder"
        } "${name}" from ${
          isBackupPathIgnore ? "backupPathIgnore" : "pathIgnore"
        }?`,
        default: false,
      },
    ]);

    if (confirmRemove) {
      ignoreList.splice(idx, 1);
      if (isBackupPathIgnore) {
        configPath.backupPathIgnore = ignoreList;
      } else {
        configPath.pathIgnore = ignoreList;
      }
      fs.writeFileSync(
        projectConfiguration,
        JSON.stringify(configPath, null, 2),
        "utf8"
      );
      console.log(
        `🗑️  "${name}" removed from ${
          isBackupPathIgnore ? "backupPathIgnore" : "pathIgnore"
        }.`
      );
    } else {
      console.log("❌ Removal cancelled.");
    }

    await inquirer.prompt({
      type: "input",
      name: "pause",
      message: "Press enter to continue...",
    });
  }

  console.log("✅ Exiting browseIgnoreList.");
}
