/*
 * Submodule for utility functions.
 */
'use strict';

var utility = {};

/**
 * Constructor for the logger.
 */
utility.Logger = function (settings) {
  this.settings = settings;
};

/**
 * Logs debug messages, if debugging is enabled.
 * @param message
 *   A message to print.
 * @param data
 *   An object to print.
 */
utility.Logger.prototype.debug = function (message, data) {
  if (!this.settings.debug) {
    return;
  }

  this.log(message, data);
};

/**
 * Logs a message unconditionally.
 */
utility.Logger.prototype.log = function (message, data) {
  console.log(this.getTimestamp(), message);
  if (data) {
    console.log(data);
  }
};

/**
 * Generates the current timestamp.
 */
utility.Logger.prototype.getTimestamp = function () {
  var now = new Date();
  var year = now.getFullYear();
  var month = this.pad(now.getMonth() + 1);
  var day = this.pad(now.getDate());
  var hour = this.pad(now.getHours());
  var min = this.pad(now.getMinutes());
  var sec = this.pad(now.getSeconds());

  return '[' + year + '/' + month + '/' + day + ' ' + hour + ':' + min + ':' + sec + ']';
};

/**
 * Pads a value to two digits.
 */
utility.Logger.prototype.pad = function (value) {
  return value < 10 ? '0' + value : value;
};

module.exports = utility;
