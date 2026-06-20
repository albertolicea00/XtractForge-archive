#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod downloader;

use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri::menu::{Menu, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use downloader::DownloadState;

// State to keep a reference to the status menu item so we can modify it dynamically
struct TrayState {
  pub status_item: Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
}

#[tauri::command]
fn update_tray_state(
  app: AppHandle,
  state: tauri::State<'_, TrayState>,
  progress: Option<f64>,
  active_count: usize,
) {
  let text = if active_count > 0 {
    let pct = progress.unwrap_or(0.0);
    format!("Extracting: {:.0}% ({} active)", pct, active_count)
  } else {
    "Idle".to_string()
  };

  // Update menu item text
  if let Ok(guard) = state.status_item.lock() {
    if let Some(ref item) = *guard {
      let _ = item.set_text(&text);
    }
  }

  // Update tray tooltip dynamically
  if let Some(tray) = app.tray_by_id("main") {
    let tooltip = format!("XtractForge - {}", text);
    let _ = tray.set_tooltip(Some(tooltip));
  }
}

fn main() {
  tauri::Builder::default()
    .manage(DownloadState::default())
    .manage(TrayState {
      status_item: Mutex::new(None),
    })
    .setup(|app| {
      // 1. Create context menu items for the tray icon
      let status_item = MenuItemBuilder::new("Idle")
        .id("status")
        .enabled(false)
        .build(app)?;

      let show_item = MenuItemBuilder::new("Show XtractForge")
        .id("show")
        .build(app)?;

      let hide_item = MenuItemBuilder::new("Hide XtractForge")
        .id("hide")
        .build(app)?;

      let quit_item = MenuItemBuilder::new("Quit")
        .id("quit")
        .build(app)?;

      let menu = Menu::with_items(app, &[
        &status_item,
        &tauri::menu::PredefinedMenuItem::separator(app)?,
        &show_item,
        &hide_item,
        &tauri::menu::PredefinedMenuItem::separator(app)?,
        &quit_item,
      ])?;

      // 2. Build the tray icon
      let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("XtractForge")
        .menu(&menu)
        .on_menu_event(|app_handle, event| {
          match event.id().as_ref() {
            "quit" => {
              app_handle.exit(0);
            }
            "show" => {
              if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
            "hide" => {
              if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.hide();
              }
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          // Double click or single left click toggles app window visibility
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
        })
        .build(app)?;

      // 3. Keep the status item reference in managed state
      let tray_state = app.state::<TrayState>();
      if let Ok(mut guard) = tray_state.status_item.lock() {
        *guard = Some(status_item);
      }

      Ok(())
    })
    .on_window_event(|window, event| match event {
      tauri::WindowEvent::CloseRequested { api, .. } => {
        let app = window.app_handle();
        let path = app.path().app_data_dir().unwrap_or_default().join("config.json");
        let mut run_in_background = false;
        if path.exists() {
          if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
              if let Some(val) = json.get("runInBackground") {
                run_in_background = val.as_bool().unwrap_or(false);
              }
            }
          }
        }

        if run_in_background {
          let _ = window.hide();
          api.prevent_close();
        }
      }
      _ => {}
    })
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
      downloader::resume_download,
      update_tray_state
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
