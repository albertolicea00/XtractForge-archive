use std::path::{Path, PathBuf};
use std::fs;
use tauri::{AppHandle, Manager};
use serde::{Serialize, Deserialize};
use serde_json::Value;

#[derive(Serialize)]
pub struct CommandResult {
  success: bool,
  stdout: String,
  stderr: String,
}

#[derive(Serialize)]
pub struct ExternalFile {
  name: String,
  content: String,
}

// Get the config.json file path
fn get_config_path(app: &AppHandle) -> PathBuf {
  let mut path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
  // Ensure the directory exists
  let _ = fs::create_dir_all(&path);
  path.push("config.json");
  path
}

// Read settings
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Value {
  let path = get_config_path(&app);
  if path.exists() {
    if let Ok(content) = fs::read_to_string(path) {
      if let Ok(json) = serde_json::from_str(&content) {
        return json;
      }
    }
  }
  // Return empty object if not found or failed to parse
  serde_json::json!({})
}

// Save settings
#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> bool {
  let path = get_config_path(&app);
  
  // Load existing config to merge
  let mut current_config = if path.exists() {
    fs::read_to_string(&path)
      .ok()
      .and_then(|c| serde_json::from_str::<Value>(&c).ok())
      .unwrap_or_else(|| serde_json::json!({}))
  } else {
    serde_json::json!({})
  };

  // Merge settings into current_config
  if let Some(current_obj) = current_config.as_object_mut() {
    if let Some(new_obj) = settings.as_object() {
      for (k, v) in new_obj {
        current_obj.insert(k.clone(), v.clone());
      }
    }
  }

  // Write back
  if let Ok(serialized) = serde_json::to_string_pretty(&current_config) {
    return fs::write(path, serialized).is_ok();
  }
  false
}

// Get plugin configs
#[tauri::command]
pub fn get_plugin_configs(app: AppHandle) -> Value {
  let config = get_settings(app);
  config.get("plugins").cloned().unwrap_or_else(|| serde_json::json!({}))
}

// Save plugin configs
#[tauri::command]
pub fn save_plugin_configs(app: AppHandle, configs: Value) -> bool {
  let mut settings = serde_json::json!({});
  if let Some(obj) = settings.as_object_mut() {
    obj.insert("plugins".to_string(), configs);
  }
  save_settings(app, settings)
}

// Folder Selection dialog
#[tauri::command]
pub fn select_folder(default_path: Option<String>) -> Option<String> {
  let mut dialog = rfd::FileDialog::new().set_title("Select Download Folder");
  if let Some(ref path) = default_path {
    dialog = dialog.set_directory(Path::new(path));
  }
  dialog.pick_folder().map(|p| p.to_string_lossy().to_string())
}

// File Selection dialog
#[tauri::command]
pub fn select_file(title: String, extension: String) -> Option<String> {
  rfd::FileDialog::new()
    .set_title(&title)
    .add_filter(&extension, &[&extension])
    .pick_file()
    .map(|p| p.to_string_lossy().to_string())
}

// Open folder in OS explorer
#[tauri::command]
pub fn open_folder(path: String) -> bool {
  let p = Path::new(&path);
  if p.exists() {
    open::that(p).is_ok()
  } else {
    false
  }
}

// Open external URL in browser
#[tauri::command]
pub fn open_external(url: String) -> bool {
  open::that(url).is_ok()
}

// Free disk space
#[tauri::command]
pub fn get_disk_free(path: String) -> Option<u64> {
  let p = Path::new(&path);
  // Fallback to parent dir if path doesn't exist yet
  let mut target = p.to_path_buf();
  while !target.exists() {
    if let Some(parent) = target.parent() {
      target = parent.to_path_buf();
    } else {
      break;
    }
  }
  fs2::free_space(target).ok()
}

// Execute external binary and return stdout/stderr
#[tauri::command]
pub async fn exec_command(binary: String, args: Vec<String>) -> CommandResult {
  let mut cmd = std::process::Command::new(&binary);
  cmd.args(&args);
  
  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    cmd.creation_flags(CREATE_NO_WINDOW);
  }

  match cmd.output() {
    Ok(output) => {
      CommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
      }
    }
    Err(e) => {
      CommandResult {
        success: false,
        stdout: String::new(),
        stderr: e.to_string(),
      }
    }
  }
}

// Read all .js files in an external directory
#[tauri::command]
pub fn read_external_files(dir_path: String) -> Vec<ExternalFile> {
  let mut results = Vec::new();
  let p = Path::new(&dir_path);
  if !p.exists() {
    let _ = fs::create_dir_all(p);
    return results;
  }

  if let Ok(entries) = fs::read_dir(p) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.is_file() && path.extension().map_or(false, |ext| ext == "js") {
        if let Ok(content) = fs::read_to_string(&path) {
          if let Some(name) = path.file_name().map(|n| n.to_string_lossy().to_string()) {
            results.push(ExternalFile { name, content });
          }
        }
      }
    }
  }
  results
}

// Write external file
#[tauri::command]
pub fn write_external_file(dir_path: String, filename: String, content: String) -> bool {
  let dir = Path::new(&dir_path);
  let _ = fs::create_dir_all(dir);
  let file_path = dir.join(filename);
  fs::write(file_path, content).is_ok()
}
