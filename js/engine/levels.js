// ========= LEVELS
// 

// Call this to enable game levels 
function enableLevels(game) {
  game.levels = [];
  game.current_level = 0;
  game.tickActions.push(function() { this.levels[this.current_level].tick(); });
  game.finalActions.push(function() { this.levels[this.current_level].draw(); });

  game.endLevel = function() {
    this.levels[this.current_level].onleave();
    if (this.editor && this.editor.enabled) {
      // switch to a different editor tool
      this.editor.setTool(this.editor.select_tool);
    }
    else {
      this.doNextLevel();
    }
  }

  game.doNextLevel = function() {
    this.current_level += 1; 
    
    if (this.current_level === this.levels.length) {
      this.restart();
    }
    else {
      this.startCurrentLevel();
    }
  }
  
  game.goToLevel = function(id) {
    if (id >= this.levels.length || id < 0) return;
    this.levels[this.current_level].onleave();
    this.current_level = id;
    game.startCurrentLevel();
  }
}

// Call this to create a level
function makeLevel(game, id) {
  var lvl = {
    id: id,
    
    // Fill in level data members here (e.g. level text, level solution, etc)
    
    tracks: {},
    
    start_track: null,
    end_track: null,

    start_dir: 1, // rotation direction of train on the starting track (1 or -1)
    
    showText: function() {}, // overwrite
    
    joints_toggled_on: [],
    
    draw: function() {
      // Fill this in (code for drawing level text, background, and other non-objects)
      //game.setFont(game.display.font_normal);
      //draw.text(game.ctx, "Level " + this.id.toString(), xy(30, 20), "nw");
      this.showText();
      
    },
    onrun: function() {
      for (var i = 0; i < this.runActions.length; i++) {
        this.runActions[i].call(this);
      }
    },
    onload: function() {
      
      game.setAllJoints(false);
      for (var i = 0; i < this.joints_toggled_on.length; i++) {
        this.joints_toggled_on[i][0].connections[this.joints_toggled_on[i][1].id] = true;
      }
      
      for (var i = 0; i < this.loadActions.length; i++) {
        this.loadActions[i].call(this);
      }
    },
    onleave: function() {
      for (var i = 0; i < this.leaveActions.length; i++) {
        this.leaveActions[i].call(this);
      }
    },
    tick: function() {
      for (var i = 0; i < this.tickActions.length; i++) {
        this.tickActions[i].call(this);
      }
    },
    runActions: [],
    loadActions: [],
    leaveActions: [],
    tickActions: [],
  };
  game.levels.push(lvl);
  
  lvl.loadActions.push(function() { 
    // Code to perform when the level is loaded
  });
  
  lvl.leaveActions.push(function() {
    // Code to perform when the level is left
    
  });
  
  // Other methods
  lvl.getTrackById = function(id) {
    if (id in this.tracks) return this.tracks[id];
    return null;
  }
  
  lvl.getStart = function() {
    return this.start_track;
  }
  
  lvl.setStart = function(track) {
    if (this.start_track) { this.start_track.unsetStart(); }
    this.start_track = track;
    track.setStart();
  }
  
  lvl.getEnd = function() {
    return this.end_track;
  }
  
  lvl.setEnd = function(track) {
    if (this.end_track) { this.end_track.unsetEnd(); }
    this.end_track = track;
    track.setEnd();
  }

  lvl.getStartDir = function() {
    return this.start_dir;
  }
  
  lvl.setStartDir = function(dir) {
    this.start_dir = dir;
  }
  

  lvl.data = function() {
    var track_data = {c:[], l:[]}
    for (var id in this.tracks) {
      var type_label = (this.tracks[id].type === 'circular') ? 'c' : 'l'
      track_data[type_label].push(this.tracks[id].data());
    }
    return {
      s: this.start_track ? this.start_track.id : null,
      sd: this.start_dir ? this.start_dir : null,
      e: this.end_track ? this.end_track.id : null,
      j: this.joints_toggled_on.map(function(joint) { return [joint[0].id, joint[1].id] }),
      t: track_data
    }
  }

  return lvl;
}

// Call this to create an object which exists only in the scope of a single level
function makeLevelObject(parent_level) {
  var obj = new GameObject(game);
  obj.level = parent_level;
  obj._tick = obj.tick;
  obj._draw = obj.draw;
  obj.tick = function() { if (game.levels[game.current_level].id != this.level.id) return; this._tick(); }
  obj.draw = function() { if (game.levels[game.current_level].id != this.level.id) return; this._draw(); }
  return obj;
}


