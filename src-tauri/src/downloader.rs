use std::collections::HashMap;
use std::sync::Mutex;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::{Command, Child};
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{AppHandle, Emitter, Manager};
use serde::{Serialize, Deserialize};

#[derive(Default)]
pub struct DownloadState {
  pub active_processes: Mutex<HashMap<String, Child>>,
}

#[derive(Serialize, Clone)]
struct DownloadLogPayload {
  #[serde(rename = "downloadId")]
  download_id: String,
  chunk: String,
}

#[derive(Serialize, Clone)]
struct DownloadCompletePayload {
  #[serde(rename = "downloadId")]
  download_id: String,
  status: String,
}

#[derive(Serialize, Clone)]
struct DownloadErrorPayload {
  #[serde(rename = "downloadId")]
  download_id: String,
  status: String,
  error: String,
}

// Media category checking
fn category_for_ext(ext: &str) -> &'static str {
  let ext_lower = ext.trim_start_matches('.').to_lowercase();
  let video_exts = ["mp4", "mkv", "webm", "mov", "avi", "flv", "ts", "m4v"];
  let audio_exts = ["mp3", "m4a", "aac", "flac", "wav", "ogg", "opus"];
  let image_exts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

  if video_exts.contains(&ext_lower.as_str()) {
    "Video"
  } else if audio_exts.contains(&ext_lower.as_str()) {
    "Audio"
  } else if image_exts.contains(&ext_lower.as_str()) {
    "Images"
  } else {
    "Other"
  }
}

// Move files from temp_dir to final_dir applying organize mode
fn move_download_files(temp_dir: &Path, final_dir: &Path, organize: &str, plugin_id: &str) -> std::io::Result<()> {
  if !temp_dir.exists() {
    return Ok(());
  }

  for entry in std::fs::read_dir(temp_dir)? {
    let entry = entry?;
    let src_path = entry.path();
    let file_name = match src_path.file_name() {
      Some(name) => name.to_string_lossy().to_string(),
      None => continue,
    };

    // Ignore hidden files/folders
    if file_name.starts_with('.') {
      continue;
    }

    let mut dest_dir = final_dir.to_path_buf();
    if organize == "type" {
      if src_path.is_dir() {
        dest_dir.push("Other");
      } else {
        let ext = src_path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
        dest_dir.push(category_for_ext(&ext));
      }
    } else if organize == "source" {
      dest_dir.push(plugin_id);
    }

    std::fs::create_dir_all(&dest_dir)?;
    let dest_path = dest_dir.join(&file_name);

    // Try rename (mv), fallback to copy + delete
    if std::fs::rename(&src_path, &dest_path).is_err() {
      copy_dir_all(&src_path, &dest_path)?;
      if src_path.is_dir() {
        std::fs::remove_dir_all(&src_path)?;
      } else {
        std::fs::remove_file(&src_path)?;
      }
    }
  }

  Ok(())
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
  if src.is_dir() {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
      let entry = entry?;
      copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
    }
  } else {
    std::fs::copy(src, dst)?;
  }
  Ok(())
}

#[tauri::command]
pub async fn start_download(
  app: AppHandle,
  state: tauri::State<'_, DownloadState>,
  download_id: String,
  binary: String,
  args: Vec<String>,
  temp_dir: Option<String>,
  final_dir: String,
  organize_mode: String,
  plugin_id: String,
) -> Result<bool, String> {
  println!("[Tauri Downloader] Spawning {} with args: {:?}", binary, args);

  let mut cmd = Command::new(&binary);
  cmd.args(&args);
  cmd.stdout(Stdio::piped());
  cmd.stderr(Stdio::piped());

  // Set process group on Unix so we can kill child processes cleanly if needed
  #[cfg(unix)]
  {
    use std::os::unix::process::CommandExt;
    cmd.process_group(0);
  }

  let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn process {}: {}", binary, e))?;

  let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
  let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

  // Store active process
  {
    let mut procs = state.active_processes.lock().unwrap();
    procs.insert(download_id.clone(), child);
  }

  let app_clone = app.clone();
  let download_id_clone = download_id.clone();
  let state_clone = app.state::<DownloadState>();

  // Process monitor task
  tokio::spawn(async move {
    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let download_id_for_stdout = download_id_clone.clone();
    let app_for_stdout = app_clone.clone();
    let stdout_handle = tokio::spawn(async move {
      while let Ok(Some(line)) = stdout_reader.next_line().await {
        let _ = app_for_stdout.emit("download-log", DownloadLogPayload {
          download_id: download_id_for_stdout.clone(),
          chunk: format!("{}\n", line),
        });
      }
    });

    let download_id_for_stderr = download_id_clone.clone();
    let app_for_stderr = app_clone.clone();
    let stderr_handle = tokio::spawn(async move {
      while let Ok(Some(line)) = stderr_reader.next_line().await {
        let _ = app_for_stderr.emit("download-log", DownloadLogPayload {
          download_id: download_id_for_stderr.clone(),
          chunk: format!("{}\n", line),
        });
      }
    });

    // Wait for stream readers to finish
    let _ = tokio::join!(stdout_handle, stderr_handle);

    // Wait for the child process to complete
    let mut child = {
      let mut procs = state_clone.active_processes.lock().unwrap();
      procs.remove(&download_id_clone)
    };

    if let Some(mut c) = child {
      match c.wait().await {
        Ok(status) if status.success() => {
          // Perform file moving and organization if temp_dir is provided
          if let Some(ref t_dir) = temp_dir {
            let temp_path = Path::new(t_dir);
            let final_path = Path::new(&final_dir);
            if let Err(e) = move_download_files(temp_path, final_path, &organize_mode, &plugin_id) {
              let _ = app_clone.emit("download-error", DownloadErrorPayload {
                download_id: download_id_clone.clone(),
                status: "error".to_string(),
                error: format!("Staging move failed: {}", e),
              });
              return;
            }
            // Cleanup temp dir
            let _ = std::fs::remove_dir_all(temp_path);
          }

          let _ = app_clone.emit("download-complete", DownloadCompletePayload {
            download_id: download_id_clone.clone(),
            status: "completed".to_string(),
          });
        }
        Ok(status) => {
          let _ = app_clone.emit("download-error", DownloadErrorPayload {
            download_id: download_id_clone.clone(),
            status: "error".to_string(),
            error: format!("Process exited with code {:?}", status.code()),
          });
        }
        Err(e) => {
          let _ = app_clone.emit("download-error", DownloadErrorPayload {
            download_id: download_id_clone.clone(),
            status: "error".to_string(),
            error: e.to_string(),
          });
        }
      }
    }
  });

  Ok(true)
}

#[tauri::command]
pub fn cancel_download(state: tauri::State<'_, DownloadState>, download_id: String) -> bool {
  let mut procs = state.active_processes.lock().unwrap();
  if let Some(mut child) = procs.remove(&download_id) {
    let _ = child.start_kill();
    true
  } else {
    false
  }
}

#[tauri::command]
pub fn pause_download(state: tauri::State<'_, DownloadState>, download_id: String) -> bool {
  #[cfg(unix)]
  {
    let procs = state.active_processes.lock().unwrap();
    if let Some(child) = procs.get(&download_id) {
      if let Some(pid) = child.id() {
        // Send SIGSTOP
        unsafe {
          return libc::kill(pid as libc::pid_t, libc::SIGSTOP) == 0;
        }
      }
    }
  }
  false
}

#[tauri::command]
pub fn resume_download(state: tauri::State<'_, DownloadState>, download_id: String) -> bool {
  #[cfg(unix)]
  {
    let procs = state.active_processes.lock().unwrap();
    if let Some(child) = procs.get(&download_id) {
      if let Some(pid) = child.id() {
        // Send SIGCONT
        unsafe {
          return libc::kill(pid as libc::pid_t, libc::SIGCONT) == 0;
        }
      }
    }
  }
  false
}
