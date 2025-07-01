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

Install the package locally in your project:

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

Upload project files to the remote server.

```bash
ftcli push [-p <path>]
```

- If `-p` option is omitted, uploads the configured build path or current directory.
- Validates FTP and project config before upload.

---

### `get`

Download the entire remote project directory.

```bash
ftcli get [-p <path>]
```

- Downloads files recursively from remote path to specified local path.
- Defaults to current directory if no path specified.

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
