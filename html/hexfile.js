/**
 * @module hex-file
 * Module for accessing chunks of a file
 */

var fs = require('fs');

/**
 * Size of a "chunk" - currently set to 4KB.
 */
var CHUNK_SIZE = 4096;

/**
 * A hex file.
 */
function HexFile(path, fd, callback) {
  this.path = path;
  this.fd = fd;
  var me = this;
  // And now grab the stats (such as file size)
  fs.fstat(fd, function(err, stats) {
    if (err) {
      callback(err);
    }
    me.stats = stats;
    me.size = stats.size;
    callback(null, me);
  });
}

HexFile.prototype = {
  close: function(callback) {
    fs.close(this.fd, callback);
  },
  readChunk: function(index, callback) {
    var start = index * CHUNK_SIZE;
    if (start >= this.size) {
      callback(new Error("Chunk " + index + " is past the end of file"));
      return;
    }
    var end = start + CHUNK_SIZE;
    if (end >= this.size)
      end = this.size - 1;
    var buffer = new Buffer(end - start);
    this.read(buffer, start, buffer.length, callback);
  },
  /**
   * Reads a chunk of the file.
   */
  read: function(buffer, offset, length, callback) {
    // TODO (maybe): Cache the chunk? The OS should be doing that for us but you
    // never know...
    var me = this;
    fs.read(this.fd, buffer, 0, length, offset, function(err, bytesRead, buffer) {
      if (err)
        return err;
      if (bytesRead < buffer.length) {
        // It looks like the only way this will happen is if we go off the end
        // of the file. TODO: check to make sure that's true.
      }
      callback(null, buffer, bytesRead);
    });
  }
}

exports.open = function(path, callback) {
  fs.open(path, 'r', function(err, fd) {
    if (err) {
      callback(err);
    } else {
      new HexFile(path, fd, callback);
    }
  });
}
exports.HexFile = HexFile;