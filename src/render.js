/**
 * This module is the main "controller" for the HTML side of hexed. It maintains
 * the window and the various open tabs inside it.
 */
"use strict";

import "./less/hexed.less";

import {ipcRenderer} from 'electron';
import 'path';

import './workspace.js';
import AboutPane from './panes/about.js';
import FilePane from './panes/file.js';

// Can process.platform ever contain things like spaces? I dunno. Just replace
// any whitespace with '-' anyway.
document.body.className = 'platform-' + process.platform.replace(/\s/, '-');

// Build our core UI.

/**
 * The main Hexed window.
 */
class Hexed {
  constructor() {
    this._doctabs = document.querySelector('x-doctabs');
    this._doctabs.addEventListener('open', (event) => {
      // Trigger an open file event
      ipcRenderer.send('open-file', this._windowId);
      event.preventDefault();
    });
    this._workspace = document.querySelector('hexed-workspace');
    // Set up IPC.
    ipcRenderer.on('set-id', (event, id) => {
      this._windowId = id;
    });

    ipcRenderer.on('open-files', (event, filenames) => {
      this.openFiles(filenames);
    });

    ipcRenderer.on('menu', (event, command) => {
      this.doMenuCommand(command);
    });
  }

  get windowId() {
    return this._windowId;
  }

  addPane(pane) {
    this._workspace.addPane(pane);
  }

  get activePane() {
    let pane = this._workspace.activePane;
    return pane ? pane.pane : null;
  }

  /**
   * Opens a given file.
   */
  openFile(filename) {
    let pane = new FilePane(filename);
    this.addPane(pane);
    return pane.openFile();
  }
  /**
   * Open multiple files at once. Returns an array of Promises generated from
   * calling {@link #openFile} on each file. Promise.all or Promise.race can
   * be used on the return result to wait for them to complete.
   */
  openFiles(filenames) {
    return filenames.map(filename => this.openFile(filename));
  }
  showAbout() {
    if (!this._aboutPane) {
      // Create the about pane
      this._aboutPane = new AboutPane();
      this._aboutPane.on('closed', () => {
        debuglog('About pane closed.');
        this._aboutPane = null;
      });
    }
    this.addPane(this._aboutPane);
  }
  doMenuCommand(command) {
    if (command == 'close-pane') {
      // A special case that gets handled here.
      let pane = this.activePane;
      if (pane) {
        pane.close();
      }
      return;
    } else if (command == 'about') {
      // One other special case: open about pane.
      this.showAbout();
      return;
    }
    // Pass through to the active pane.
    let pane = this.activePane;
    if (pane)
      pane.executeMenuCommand(command);
  }
};

const hexed = new Hexed();

exports.hexed = hexed;

// Add drag and drop handlers so you can drop a file on the window and it will
// open in it
let contents = document.body;

contents.addEventListener('dragenter', (event) => {
  // Check to see if the event is a file
  if (event.dataTransfer.files.length == 1) {
    event.dataTransfer.effectAllowed = 'move';
  } else {
    event.dataTransfer.effectAllowed = 'none';
  }
}, false);

contents.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  return false;
});

contents.addEventListener('drop', (event) => {
  if (event.dataTransfer.files.length > 0) {
    // We actually want to notify our parent controller of this drop
    var files = [];
    for (var i = 0; i < event.dataTransfer.files.length; i++) {
      files.push(event.dataTransfer.files[i].path);
    }
    ipcRenderer.send('files-dropped', hexed.windowId, files);
  }
}, false);