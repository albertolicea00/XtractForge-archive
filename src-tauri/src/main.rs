#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod downloader;

use downloader::DownloadState;

fn main() {
  tauri::Builder::default()
    .manage(DownloadState::default())
    .invoke_handler(tauri::generate_handler![
      commands::get_settings,
      commands::save_settings,
      commands::get_plugin_configs,
      commands::save_plugin_configs,
      commands::select_folder,
      commands::select_file,
      commands::open_folder,
      commands::open_external,
      commands::get_disk_free,
      commands::exec_command,
      commands::read_external_files,
      commands::write_external_file,
      downloader::start_download,
      downloader::cancel_download,
      downloader::pause_download,
      downloader::resume_download
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
