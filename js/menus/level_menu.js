loopery.levelMenu = {};

loopery.levelMenu.addSection = function(name) {
  var id = this.turnSectionNameIntoId(name);
  return $("<div></div>").addClass('level-section').addClass('button-click-sound').attr('id', id).append('<h2>' + name + '</h2>').appendTo('#level-sections');
}

loopery.levelMenu.turnSectionNameIntoId = function(name) {
  return 'section-' + name.replace(' ', '-')
}

loopery.levelMenu.populateLink = function(level_metadata, index) {
  // If the section for this level doesn't exist, then make it.
  var $section = $('.level-section').filter(function(i, section) {
    return $(section).attr('id') === loopery.levelMenu.turnSectionNameIntoId(level_metadata.section);
  });
  if ($section.length === 0) {
    $section = loopery.levelMenu.addSection(level_metadata.section);
  }
  level_metadata.link = $("<a></a>").addClass('level-menu-link').data({index: index}).appendTo($section);

  // this could be improved
  $sortBy($section.find(".level-menu-link"), function(e) { return $(e).data('index'); })

  return level_metadata.link;
}


loopery.levelMenu.attachLevelToLink = function(link, label, callback) {
  link.text(label).bind('click', callback);
}


function $sortBy($elements, transform) {
  var parent = $elements.parent();
  $elements.detach().sort(function(el1, el2) {
    return transform(el1) - transform(el2);
  }).appendTo(parent);
}