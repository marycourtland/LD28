// TODO: ensure circular tracks are drawn after linear tracks


// Generic track
function makeTrack(level, id) {
  var track = makeLevelObject(level);
  //var track = new GameObject(game);
  track.id = (id || game.next_track);
  
  level.tracks[track.id] = track;
  
  game.next_track++;
  game.tracks[track.id] = track;
  
  // This is true if the track is the starting pseudotrack (offscreen to the left)
  track.is_start = false;
  track.setStart = function() { this.is_start = true; }
  
  // This is true if the track is the ending pseudotrack (offscreen to the right)
  track.is_end = false;
  track.setEnd = function() { this.is_end = true; }
  
  // This is true if the track is next to the starting pseudotrack
  track.is_first = false;
  track.setFirst = function() { this.is_first = true; }
  
  // This is true if the track is next to the ending pseudotrack
  track.is_last = false;
  track.setLast = function() { this.is_last = true; }
  
  // Subclasses should implement these methods:
  //   track.getNextPos
  //   track.getPosCoords
  //   track.checkForConnections
  //   track.getPosFromOldTrack
  //   track.getDirFromOldTrack
  
  return track;
  
}

// Circular track
function makeCircleTrack(level, pos, radius, id) {
  var track = makeTrack(level, id);
  track.type = 'circular';
  
  track.color = game.display.track_color;
  
  track.radius = radius;
  track.placeAt(pos);
  track.connections = {}; // linear tracks connecting this with another circular track
    
  track.drawActions.push(function() {
    emptyCircle(this.ctx,
      this.pos,
      this.radius,
      this.color,
      game.display.track_width
    );
    if (game.display.shade_hovered_circle_track && this.contains(game.mouse.pos)) {
      this.shade();
    }
  })
  
  track.shade = function() {
    this.ctx.globalAlpha = 0.5;
    circle(this.ctx,
      this.pos,
      this.radius - game.display.track_width/2,
      "black"
    );
    this.ctx.globalAlpha = 1;
  }
  
  track.old_pos = xy(-1, -1);
  track.tickActions.push(function() {
    if (equals(this.pos, this.old_pos)) return;
    this.old_pos = this.pos.copy();
    for (var id in this.connections) {
      game.tracks[id].recomputePlacement();
    }
  });
  
  track.getNextPos = function(old_pos, dir) {
    return mod(old_pos + dir * game.train_speed / (2 * Math.PI * this.radius), 1);
  }
  
  // Given a position on the track (from 0 to 1), return the XY coords
  track.getPosCoords = function(pos) {
    var angle = pos * 2 * Math.PI;
    return add(this.pos, rth(this.radius, angle));
  }
  
  // This looks to see if an object going from oldpos to newpos has
  // switched onto a linear track.
  // Returns the track that the train goes onto; or false is there is none
  track.checkForConnections = function(oldpos, newpos) {
    for (track_id in this.connections) {
      if (!this.connections[track_id]) continue; // skip tracks that aren't turned on
      var track = game.tracks[track_id];
      var p = track.parent_track_pos[this.id];
      if (isBetweenOnCircle(p, oldpos, newpos, 1)) { return track; }
      
    }
    return false;
  }
  
  track.getPosFromOldTrack = function(linear_track) {
    return linear_track.parent_track_pos[this.id];
  }
  
  track.getDirFromOldTrack = function(linear_track) {
    return -1 * linear_track.parent_track_winding[this.id];
  }
  
  track.toggleJoint = function(track_id) {
    if (!(track_id in this.connections)) return;
    this.connections[track_id] = !this.connections[track_id];
    
  }
  
  track.contains = function(pos) {
    return distance(pos, this.pos) < (this.radius - game.display.track_width/2);
  }
  
  track.onclick = function(pos) {
    // The purpose of this is to enable the level editor to know which track
    // has been selected.
    // Splice is used instead of push because we want the most recently
    // clicked track (i.e. the one later in game.objects) to be at position 0.
    if (this.level && this.level.id !== game.current_level) return;
    game.clicked_tracks.splice(0, 0, this);
  }
  
  // For testing purposes
  handle(track);
  
  return track;
}

// Linear tracks connect the circular tracks together.
// NOTE: Usually, linear tracks are created with the makeOuterTangentTrack or makeInnerTangentTrack methods.
// winding = 1 means: if the linear track was a string, it would wrap CW around a parent circular track
// winding = -1 means: it would wrap CCW
function makeLinearTrack(level, track1, pos1, winding1, track2, pos2, winding2, disable_clickers, id) {
  var track = makeTrack(level, id);
  track.type = 'linear';
  track.subtype = ''; // 'out' or 'in'
  track.color = game.display.track_color;
  
  pos1 = mod(pos1, 1);
  pos2 = mod(pos2, 1);
  
  // parent circular tracks
  // track1 is at the end where pos=0;
  // track2 is at the end where pos=1
  track.track1 = track1;
  track.track2 = track2;
  track.parent_track_pos = {};
  track.parent_track_pos[track1.id] = pos1;
  track.parent_track_pos[track2.id] = pos2;
  track.parent_track_winding = {};
  track.parent_track_winding[track1.id] = winding1;
  track.parent_track_winding[track2.id] = winding2;
  track1.connections[track.id] = false;
  track2.connections[track.id] = false;
  
  track.recomputePlacement = function() {
    if (this.which_outer !== undefined) {
      // If this track was generated as an outer tangent, then regenerate it
      var pts = getOuterTangents(track1, track2);
      this.parent_track_pos[this.track1.id] = pts[this.which_outer][0];
      this.parent_track_pos[this.track2.id] = pts[this.which_outer][1];
    }
    if (this.which_inner !== undefined) {
      // If this track was generated as an outer tangent, then regenerate it
      var pts = getInnerTangents(track1, track2);
      this.parent_track_pos[this.track1.id] = pts[this.which_inner][0];
      this.parent_track_pos[this.track2.id] = pts[this.which_inner][1];
    }
    
    var p1 = this.track1.getPosCoords(this.parent_track_pos[this.track1.id]);
    var p2 = this.track2.getPosCoords(this.parent_track_pos[this.track2.id]);
    this.angle = subtract(p2, p1).th;
    this.length = subtract(p2, p1).r;
    
    if (this.clicker1 && this.clicker2) {
      this.clicker1.pos = this.getPosCoords(game.display.clicker_offset);
      this.clicker2.pos = this.getPosCoords(1 - game.display.clicker_offset);
      this.clicker1.pos = add(this.getPosCoords(0), rth(game.joint_click_distance, this.angle));
      this.clicker2.pos = add(this.getPosCoords(1), rth(-game.joint_click_distance, this.angle));
    }
  }
  
  track.drawActions.push(function() {
    var p1 = this.getPosCoords(0);
    var p2a = this.getPosCoords(game.display.darkened_track_extent);
    var p2b = this.getPosCoords(game.display.darkened_track_extent - 0.01);
    var p3a = this.getPosCoords(1 - game.display.darkened_track_extent);
    var p3b = this.getPosCoords(1 - game.display.darkened_track_extent + 0.01);
    var p4 = this.getPosCoords(1);
    
    // Determine which ends to darken (based whether connections are on or off)
    var dark_end1 = !this.track1.connections[this.id];
    var dark_end2 = !this.track2.connections[this.id];
    
    // Neither ends are darkened
    if (!(dark_end1 || dark_end2)) line(this.ctx, p1, p4, this.color, game.display.track_width);
    
    // Only first end is darkened
    if (dark_end1 && !dark_end2) {
      lineGradient(game.ctx, p1, p2a, 'black', 'white', game.display.track_width);
      line(this.ctx, p2b, p4, this.color, game.display.track_width)
    }
    
    // Only second end is darkened
    if (!dark_end1 && dark_end2) {
      line(this.ctx, p1, p3b, this.color, game.display.track_width)
      lineGradient(game.ctx, p4, p3a, 'black', 'white', game.display.track_width);
    }
    
    // Both ends are darkened
    if (dark_end1 && dark_end2) {
      lineGradient(game.ctx, p1, p2a, 'black', 'white', game.display.track_width);
      line(this.ctx, p2b, p3b, this.color, game.display.track_width)
      lineGradient(game.ctx, p4, p3a, 'black', 'white', game.display.track_width);
    }
    
  })
  
  track.getNextPos = function(old_pos, dir) {
    return old_pos + dir * game.train_speed / this.length;
  }
  
  // given the id of a circular track on one end of this track,
  // returns the track id of the circular track on the other end
  // TODO: I don't remember using this method ever... if so, remove it
  track.getOppositeTrackId = function(track_id) {
    if (!(track_id === this.track1.id || track_id === this.track2.id)) return false;
    if (track_id === this.track1.id) return this.track2.id;
    return this.track1.id;
  }
  
  track.getPosCoords = function(pos) {
    return add(this.track1.getPosCoords(this.parent_track_pos[this.track1.id]), rth(this.length * pos, this.angle));
  }
  
  track.checkForConnections = function(oldpos, newpos) {
    if (newpos > 1) { return this.track2; }
    if (newpos < 0) { return this.track1; }
    return false;
  }
  
  track.getPosFromOldTrack = function(circular_track) {
    if (circular_track.id === this.track1.id) return 0;
    return 1;
  }
  
  track.getDirFromOldTrack = function(circular_track) {
    if (circular_track.id === this.track1.id) return 1;
    return -1;
  }
  
  
  
  track.recomputePlacement();
  
  // Make 'clicker' objects
  // These are the little shadows that appear over joints between
  // linear and circular tracks. When clicked, they toggle the joint.
  if (!disable_clickers) {
    track.clicker1 = makeLevelObject(level);
    track.clicker2 = makeLevelObject(level);
    track.clicker1.type = 'clicker';
    track.clicker2.type = 'clicker';
    track.clicker1.track = track; // circular references, yay
    track.clicker2.track = track;
    track.clicker1.pos = track.getPosCoords(0.4);
    track.clicker2.pos = track.getPosCoords(0.9);
    track.clicker1.drawActions.push(function() {
      // Draw the clicker if any of these conditions are met:
      // - SHIFT is pressed (which should let the player see all clickers)
      // - The mouse is over the clicker
      if (!(game.isKeyPressed("SHIFT") || distance(game.mouse.pos, this.pos) <= game.joint_click_radius)) { return; }
      var old_alpha = this.ctx.globalAlpha;
      this.ctx.globalAlpha = 0.3;
      circle(this.ctx, 
        this.pos,
        game.joint_click_radius,
        'black'
      )
      this.ctx.globalAlpha = old_alpha;
    })
    track.clicker2.drawActions.push(function() {
      // Draw the clicker if any of these conditions are met:
      // - SHIFT is pressed (which should let the player see all clickers)
      // - The mouse is over the clicker
      if (!(game.isKeyPressed("SHIFT") || distance(game.mouse.pos, this.pos) <= game.joint_click_radius)) { return; }
      var old_alpha = this.ctx.globalAlpha;
      this.ctx.globalAlpha = 0.3;
      circle(this.ctx, 
        this.pos,
        game.joint_click_radius,
        'black'
      )
      this.ctx.globalAlpha = old_alpha;
    })
    track.clicker1.contains = function(p) {
      if (game.levels[game.current_level].id != this.level.id) return false;
      return distance(p, this.pos) <= game.joint_click_radius;
    }
    track.clicker2.contains = function(p) { // todo: this is also supposed to be the same as clicker1.contains
      if (game.levels[game.current_level].id != this.level.id) return false;
      return distance(p, this.pos) <= game.joint_click_radius;
    }
    track.clicker1.onclick = function(p) {
      if (game.levels[game.current_level].id != this.level.id) return;
      this.track.track1.toggleJoint(this.track.id);
    }
    track.clicker2.onclick = function(p) {
      if (game.levels[game.current_level].id != this.level.id) return;
      this.track.track2.toggleJoint(this.track.id);
    }
  }
  
  
  return track;
}



// Utility methods - to find position of linear tracks tangent to two circular tracks
// WARNING: MESSY CODE (but it works)
function getOuterTangents(track1, track2, echo) {
  if (track2.radius === track1.radius) {
    var dd = subtract(track1.pos, track2.pos);
    return [
      [(dd.th + Math.PI/2)/(2 * Math.PI), (dd.th + Math.PI/2)/(2 * Math.PI)],
      [(dd.th - Math.PI/2)/(2 * Math.PI), (dd.th - Math.PI/2)/(2 * Math.PI)]
    ]
  }
  
  // circle1 should be the smaller one, and circle2 should be the larger one
  if (track2.radius > track1.radius) {
    p1 = track1.pos
    p2 = track2.pos
    rad1 = track1.radius
    rad2 = track2.radius
  }
  else {
    p1 = track2.pos
    p2 = track1.pos
    rad1 = track2.radius
    rad2 = track1.radius
  }
  var dd = subtract(p2, p1);
  var r21 = rad2 - rad1;
  var l = Math.sqrt(dd.r*dd.r - r21*r21);
  var lth1 = dd.th - Math.acos(l/dd.r);
  var lth2 = dd.th + Math.acos(l/dd.r);
  var ll1 = rth(l, lth1);
  var ll2 = rth(l, lth2);
  var rr1 = subtract(ll1, dd);
  var rr2 = subtract(ll2, dd);
  var dr1 = rth(rad1, rr1.th);
  var dr2 = rth(rad1, rr2.th);
  
  // This returns the circular positions
  // NB: the order in which they are returned should depend on the order in
  // which they were passed into the method, not on their track size. But
  // dr1, dr2 etc are defined based on size. So that's why this if statement
  // is needed. 
  // (The two return arrays in each case are the same, except for swapped elements)
  if (track2.radius > track1.radius) {
    return [
      [dr1.th / (2*Math.PI), add(rr1, dr1).th / (2*Math.PI)],
      [dr2.th / (2*Math.PI), add(rr2, dr2).th / (2*Math.PI)],
    ]
  }
  else {
    return [
      [dr2.th / (2*Math.PI), add(rr2, dr2).th / (2*Math.PI)],
      [dr1.th / (2*Math.PI), add(rr1, dr1).th / (2*Math.PI)],
    ]
  }
    
  // This returns the actual coordinate positions of the track endpoints
  //return [
  //  [add(p1, dr1), add(add(p2, rr1), dr1)],
  //  [add(p1, dr2), add(add(p2, rr2), dr2)],
  //]
}

// This only works if track1's radius is greater or equal to track2's radius
// TODO: fix that
function getInnerTangents(track1, track2, echo) {
  /*if (track2.radius === track1.radius) {
    var dd = subtract(p2, p1);
    return [
      [dd.th + Math.PI/4, dd.th + Math.PI/4],
      [dd.th - Math.PI/4, dd.th - Math.PI/4]
    ]
  }*/
  
  // circle1 should be the larger one, and circle2 should be the smaller one
  if (track1.radius >= track2.radius) {
    p1 = track1.pos
    p2 = track2.pos
    rad1 = track1.radius
    rad2 = track2.radius
  }
  else {
    p1 = track2.pos
    p2 = track1.pos
    rad1 = track2.radius
    rad2 = track1.radius
  }
  var dd = subtract(p2, p1);
  var r21 = rad2 + rad1;
  if (dd.r < r21) return [[null, null], [null, null]]; // circles are overlapping
  
  var l = Math.sqrt(dd.r*dd.r - r21*r21);
  var lth1 = dd.th - Math.acos(l/dd.r);
  var lth2 = dd.th + Math.acos(l/dd.r);
  var ll1 = rth(l, lth1);
  var ll2 = rth(l, lth2);
  var rr1 = subtract(ll1, dd);
  var rr2 = subtract(ll2, dd);
  
  // This returns the circular positions
  // NB: the order in which they are returned should depend on the order in
  // which they were passed into the method, not on their track size. But
  // dr1, dr2 etc are defined based on size. So that's why this if statement
  // is needed. 
  // (The two return arrays in each case are the same, except for swapped elements)
  
  // NOTE:
  // Here, we use >. However at the beginning of the method we use >=
  // This is not an accident. For some reason, it works when it's this way
  // TODO: find out why
  if (true || track2.radius > track1.radius) {
    return [
      //[rr1.th / (2*Math.PI), (rr1.th + Math.PI/2) / (2*Math.PI)],
      //[rr2.th / (2*Math.PI), (rr2.th + Math.PI/2) / (2*Math.PI)],
      [mod((rr1.th + Math.PI) / (2*Math.PI), 1), mod(rr1.th / (2*Math.PI), 1)],
      [mod((rr2.th + Math.PI) / (2*Math.PI), 1), mod(rr2.th / (2*Math.PI), 1)],
    ]
  }
  else {
    return [
      [mod((rr2.th + Math.PI) / (2*Math.PI), 1), mod(rr2.th / (2*Math.PI), 1)],
      [mod((rr1.th + Math.PI) / (2*Math.PI), 1), mod(rr1.th / (2*Math.PI), 1)],
    ]
  }

}

// There are always two possible outer tangent tracks. The 'which' variable denotes which one should be made: 0 or 1.
function makeOuterTangentTrack(level, track1, track2, which, disable_clicker) {
  if (which === null) which = 0;
  var pts = getOuterTangents(track1, track2);
  if (isNaN(pts[which][0]) || isNaN(pts[which][1])) {
    console.log("Warning: points for outer linear track between", track1.id, "and", track2.id, " could not be computed");
    return null;
  }
  var track = makeLinearTrack(level, track1, mod(pts[which][0], 1), (1 - which*2), track2, mod(pts[which][1], 1), -(1 - which*2), disable_clicker);
  track.which_outer = which;
  track.subtype = 'out';
  return track;
}

function makeInnerTangentTrack(level, track1, track2, which, disable_clicker) {
  if (which === null) which = 0;
  var pts = getInnerTangents(track1, track2);
  if (isNaN(pts[which][0]) || isNaN(pts[which][1])) {
    console.log("Warning: points for inner linear track between", track1.id, "and", track2.id, " could not be computed");
    return null;
  }
  var track = makeLinearTrack(level, track1, mod(pts[which][0], 1), -(1 - which*2), track2, mod(pts[which][1], 1), -(1 - which*2), disable_clicker);
  track.which_inner = which;
  track.subtype = 'in';
  return track;
}
