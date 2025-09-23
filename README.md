# ftcli

A command-line tool for managing FTP projects: configure connections, browse remote folders, upload/download directories recursively, handle backups, and manage ignore lists — all via simple commands.

---

## Features

- Configure and validate FTP connection parameters
- Interactively browse remote FTP directories
- Set local project paths and configure ignore lists
- Upload entire directories (including build folders) recursively to FTP
- Download remote directories recursively to local paths
- Create backups of remote project folders with ignore support
- Delete remote folders while preserving backup folders
- Restore remote directories from the latest backup
- Manage ignore lists for push and backup operations
- Supports optional command flags (e.g., specify paths)

---

## Installation

Install the package globally in your project:

```bash
npm install -g conclaveftp
```

*You can run commands with `ftcli <command>` or add it to your npm scripts.*

---

## Usage

```bash
ftcli <command> [options]
```

---

## Commands

### `config`

Configure or reset FTP connection settings.

```bash
ftcli config
```

- Resets FTP config (`host`, `user`, `password`) to empty.
- Validates config by attempting FTP connection.
- Prints success or error messages.

---

### `cpath`

Connect to FTP and interactively browse remote project folder.

```bash
ftcli cpath
```

- Requires valid FTP config.
- Opens interactive navigation to set remote paths.

---

### `bpath`

Select and set the local project directory to upload.

```bash
ftcli bpath
```

- Opens interactive local folder browser.
- Prints selected directory.

---

### `expath`

Select paths to exclude from project upload.

```bash
ftcli expath
```

- Opens interactive local folder browser for exclusion list.

---

### `edignore`

Edit the list of ignored paths for project push.

```bash
ftcli edignore
```

---

### `exbackuppath`

Exclude paths from the backup process on the remote server.

```bash
ftcli exbackuppath
```

- Requires valid FTP config.
- Connects to FTP and interactively selects paths to exclude from backups.

---

### `edbackupignore`

Edit the backup ignore list.

```bash
ftcli edbackupignore
```

---
### `push`

Upload your project files to the remote FTP server.

```bash
ftcli push [-p <path>] [--delete]
```

#### Options

- `-p, --path <path>`  
Optional. Specify the local folder to upload.  
If omitted, it will use the configured `buildPath` from the project configuration, or the current directory as fallback.

- `-d, --delete`  
Optional. Delete the remote directory before uploading.  
A backup will be created automatically before deletion.

---

## 🔹 `commit`

Creates a zip package of your source and uploads it to the configured remote folder.  
A new version (`Vx_y`) is created incrementally and saved with a timestamp.

```bash
ftcli commit [-p <path>] [-m <message>]
```

### Options

- `-p, --path <path>`  
  (optional) Local folder path to upload.  
  If omitted, it uses `sourcePath` from the configuration file, or the current folder.  

- `-m, --messagge <message>`  
  (optional) Adds a commit message (saved as `notes.txt`).  

---

## 🔹 `get`

Recursively downloads the entire remote project folder (not the zipped versions).  

```bash
ftcli get [-p <path>]
```

### Options

- `-p, --path <path>`  
  (optional) Local folder path to save the downloaded files.  
  Defaults to the current folder if not specified.  

---

## 🔹 `pull`

Downloads a specific project version (or the latest available) and extracts it into the local folder.  

```bash
ftcli pull [-p <path>] [-v <version>] [--nd]
```

### Options

- `-p, --path <path>`  
  (optional) Local folder path where the version will be extracted.  
  Defaults to `sourcePath` from the config or the current folder.  

- `-v, --version <version>`  
  (optional) Version number to download (`1_0`, `1_1`, etc.).  
  Defaults to the latest available version if not specified.  

- `--nd, --noDelete`  
  (optional) Do not clear the folder before extraction.  
  If not set, the target folder is cleaned (except `pathProject.json` and `configFtp.json`).  

---

### `backup`

Create a backup of the remote project directory in the configured backup folder.

```bash
ftcli backup
```

---

### `delete`

Delete all remote folders except backup folders.

```bash
ftcli delete
```

---

### `restore`

Clear remote project path and restore from latest backup.

```bash
ftcli restore
```

---

## Configuration Files

This project uses two JSON configuration files:

- `configFtp.json`: Stores FTP connection info (`host`, `user`, `password`)  
- `pathProject.json`: Stores project-related paths and ignore lists

These files are **automatically created** with default empty values if missing, so you don’t need to create them manually unless you want to prefill data.

**Important:**  
These files are listed in `.gitignore` and should **not be committed** to the repository because they may contain sensitive data.

If you want to create config files manually or share a template, use the example files:

- `configFtp_example.json`  
- `pathProject_example.json`

Copy them as follows:

```bash
cp configFtp_example.json configFtp.json
cp pathProject_example.json pathProject.json
```

Then edit your local copies with your actual settings.

---

## Example Workflow

1. Run `ftcli config` to setup your FTP credentials.  
2. Use `ftcli cpath` to select the remote project directory.  
3. Use `ftcli bpath` to select your local project folder.  
4. Use `ftcli push` to upload your project.  
5. Use `ftcli backup` to create backups.  
6. Use `ftcli get` to download files from FTP.  
7. Modify ignore lists with `edignore` or `edbackupignore` as needed.

---

## Author & Credits

**Giulio Pisano**  
Email: giuliopisano05@gmail.com  
[LinkedIn](https://www.linkedin.com/in/giuliopisano24)
[GitHub](https://github.com/GiuliettoJava)

---

If you have questions, issues, or suggestions, feel free to reach out!
