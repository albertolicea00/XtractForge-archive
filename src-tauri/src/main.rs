#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod downloader;

use std::sync::Mutex;
use tauri::{AppHandle, Manager, Emitter};
use tauri::menu::{Menu, MenuItemBuilder, MenuBuilder, SubmenuBuilder, PredefinedMenuItem};
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
  status_text: String,
  tooltip_text: Option<String>,
  title_text: Option<String>,
) {
  // Update menu item text
  if let Ok(guard) = state.status_item.lock() {
    if let Some(ref item) = *guard {
      let _ = item.set_text(&status_text);
    }
  }

  // Update tray tooltip and title dynamically
  if let Some(tray) = app.tray_by_id("main") {
    if let Some(tooltip) = tooltip_text {
      let _ = tray.set_tooltip(Some(tooltip));
    }
    if let Some(title) = title_text {
      let _ = tray.set_title(Some(title));
    }
  }
}

#[tauri::command]
fn open_settings_window(app: AppHandle) {
  if let Some(window) = app.get_webview_window("settings") {
    let _ = window.show();
    let _ = window.set_focus();
  } else {
    let _ = tauri::WebviewWindowBuilder::new(
      &app,
      "settings",
      tauri::WebviewUrl::App("index.html".into())
    )
    .title("Preferences")
    .inner_size(680.0, 580.0)
    .resizable(false)
    .decorations(true)
    .build();
  }
}

#[tauri::command]
fn focus_main_window(app: AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
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

      // 4. Create native application menu
      let preferences_item = MenuItemBuilder::new("Preferences...")
        .id("preferences")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

      let check_updates_item = MenuItemBuilder::new("Check for Updates...")
        .id("check_updates")
        .build(app)?;

      let menu = if cfg!(target_os = "macos") {
        let app_menu = SubmenuBuilder::new(app, "XtractForge")
          .item(&PredefinedMenuItem::about(app, None, None)?)
          .separator()
          .item(&preferences_item)
          .separator()
          .item(&PredefinedMenuItem::services(app, None)?)
          .separator()
          .item(&PredefinedMenuItem::hide(app, None)?)
          .item(&PredefinedMenuItem::hide_others(app, None)?)
          .item(&PredefinedMenuItem::show_all(app, None)?)
          .separator()
          .item(&PredefinedMenuItem::quit(app, None)?)
          .build()?;

        let file_menu = SubmenuBuilder::new(app, "File")
          .item(&PredefinedMenuItem::close_window(app, None)?)
          .build()?;

        let edit_menu = SubmenuBuilder::new(app, "Edit")
          .item(&PredefinedMenuItem::undo(app, None)?)
          .item(&PredefinedMenuItem::redo(app, None)?)
          .separator()
          .item(&PredefinedMenuItem::cut(app, None)?)
          .item(&PredefinedMenuItem::copy(app, None)?)
          .item(&PredefinedMenuItem::paste(app, None)?)
          .separator()
          .item(&PredefinedMenuItem::select_all(app, None)?)
          .build()?;

        let help_menu = SubmenuBuilder::new(app, "Help")
          .item(&check_updates_item)
          .build()?;

        MenuBuilder::new(app)
          .item(&app_menu)
          .item(&file_menu)
          .item(&edit_menu)
          .item(&help_menu)
          .build()?
      } else {
        let file_menu = SubmenuBuilder::new(app, "File")
          .item(&preferences_item)
          .separator()
          .item(&PredefinedMenuItem::quit(app, None)?)
          .build()?;

        let edit_menu = SubmenuBuilder::new(app, "Edit")
          .item(&PredefinedMenuItem::undo(app, None)?)
          .item(&PredefinedMenuItem::redo(app, None)?)
          .separator()
          .item(&PredefinedMenuItem::cut(app, None)?)
          .item(&PredefinedMenuItem::copy(app, None)?)
          .item(&PredefinedMenuItem::paste(app, None)?)
          .separator()
          .item(&PredefinedMenuItem::select_all(app, None)?)
          .build()?;

        let help_menu = SubmenuBuilder::new(app, "Help")
          .item(&check_updates_item)
          .separator()
          .item(&PredefinedMenuItem::about(app, None, None)?)
          .build()?;

        MenuBuilder::new(app)
          .item(&file_menu)
          .item(&edit_menu)
          .item(&help_menu)
          .build()?
      };

      app.set_menu(menu)?;

      Ok(())
    })
    .on_menu_event(|app_handle, event| {
      match event.id().as_ref() {
        "preferences" => {
          open_settings_window(app_handle.clone());
        }
        "check_updates" => {
          let _ = app_handle.emit("check-for-updates-menu", ());
        }
        _ => {}
      }
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
      update_tray_state,
      open_settings_window,
      focus_main_window
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
