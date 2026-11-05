# Client WordPress site – working copy

1. Open this `site` folder in VS Code.
2. Install the "SFTP" extension by Natizyskunk.
3. Edit `.vscode/sftp.json`: set host, username, and remotePath (folder containing wp-config.php).
   The password is prompted on connect – do not save it in the file.
4. Cmd+Shift+P → "SFTP: Download Project" to pull files.
5. git add . && git commit -m "Initial snapshot from server"
6. When ready, set "uploadOnSave": true in sftp.json (or upload files manually via right-click → Upload).

Raw server backup goes in ../backup-original (download with Cyberduck/FileZilla, never edit it).
