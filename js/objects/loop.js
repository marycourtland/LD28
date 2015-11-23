loopery.Loop = function(id, canvas_context, lookup_func) {
  this.group = 'loops';
  this.id = id;
  this.ctx = canvas_context;
  this.lookup = lookup_func;
  this.show_shade = false;

  this.init = function(data) {
    this.old_loc = xy(-1, -1);
    this.loc = xy(data.x, data.y);
    this.radius = data.r;
    // (two different formats of event triggering - hacky)
  }

  this.getData = function() {
    return {
      id: this.id,
      x: this.loc.x,
      y: this.loc.y,
      r: this.radius
    }
    // todo: shading
  }

  $(this).on('tick', function() {});

  // See if the loop has moved placement (e.g. in level editor)
  this.hasMoved = function() {
    return !equals(this.loc, this.old_loc);
  }
  
  // Determine an orb's next position on the loop (as it's moving)
  this.getNextPos = function(old_pos, dir, speed) {
    return mod(old_pos + dir * speed / (2 * Math.PI * this.radius), 1);
  }
  
  // Given an orb's position on the loop (from 0 to 1), return the XY coords
  this.getPosCoords = function(pos) {
    var angle = pos * 2 * Math.PI;
    return add(this.loc, rth(this.radius, angle));
  }

  // Given an orb's loc (xy coords), return position on loop
  this.getPosFromLoc = function(loc) {
    return subtract(loc, this.loc).th / (2 * Math.PI);
  }

  this.getPosFromOldTrack = function(connector) {
    // TODO: fix this method
    return connector.parent_track_pos[this.id];
  }

  this.getDirFromOldTrack = function(connector) {
    return -1 * connector.parent_track_winding[this.id];
    // TODO: fix this method
  }

  this.contains = function(loc) {
    return distance(loc, this.loc) < (this.radius - loopery.display.track_width/2);
  }

  this.shade = function(color) {
    if (!color) { color = 'white'; }
    draw.circle(this.ctx, this.loc, this.radius - loopery.display.track_width/2,
      {
        fill: color,
        alpha: 0.3
      }
    );
    this.show_shade = false;
  }
  
  $(this).on('draw', function() {
    if (!loopery.state.redraw_bg) { return; }
    if (this.show_shade || (loopery.display.shade_hovered_circle_track && this.contains(loopery.mouse.pos))) {
      this.shade();
    }
    draw.circle(this.ctx, this.loc, this.radius, {
      fill: 'transparent',
      stroke: loopery.display.track_color,
      lineWidth: loopery.display.track_width
    });
  });

  this.bindEvents = function() {
    this.on('click', function() {
      if (loopery.features.toggleAllJointsOnLoop) {
        this.lookup({loop_id: this.id, group: 'joints'}).forEach(function(joint) {
          console.log('Joint:', joint);
          joint.toggle();
        });
      }
    });
  }
}

