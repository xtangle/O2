var width = 600;
var height = 500;
var sens = 0.25;
var focused;

// Setting projection
var projection = d3.geo.orthographic()
  .scale(245)
  .rotate([0, 0])
  .translate([width/2, height/2])
  .clipAngle(90);

var path = d3.geo.path()
  .projection(projection);

// SVG container
var svg = d3.select('#globe')
  .attr('width', width)
  .attr('height', height);

// Adding water
svg.append('path')
  .datum({type: 'Sphere'})
  .attr('class', 'water')
  .attr('d', path);

var countryTooltip = d3.select('body').append('div').attr('class', 'countryTooltip');
var countryList = d3.select('body').append('select').attr('name', 'countries');

queue()
  .defer(d3.json, 'globe/world-110m-withlakes.json')
  .defer(d3.tsv, 'globe/world-110m-country-names.tsv')
  .await(ready);

// Main function
function ready(error, world, countryData) {

  var countryById = {};
  var countries = topojson.feature(world, world.objects.countries).features;
  var lakes = topojson.feature(world, world.objects.ne_110m_lakes).features;

  // Adding countries to select
  countryData.forEach(function(d) {
    countryById[d.id] = d.name;
    option = countryList.append('option');
    option.text(d.name);
    option.property('value', d.id);
  });

  // Drawing countries on the globe
  svg.selectAll('path.land')
    .data(countries)
    .enter().append('path')
    .attr('class', 'land')
    .attr('d', path)

    // Mouse events
    .on('mouseover', function(d) {
      countryTooltip.text(countryById[d.id])
        .style('left', (d3.event.pageX + 7) + 'px')
        .style('top', (d3.event.pageY - 15) + 'px')
        .style('display', 'block')
        .style('opacity', 1);
    })
    .on('mouseout', function(d) {
      countryTooltip.style('opacity', 0)
        .style('display', 'none');
    })
    .on('mousemove', function(d) {
      countryTooltip.style('left', (d3.event.pageX + 7) + 'px')
        .style('top', (d3.event.pageY - 15) + 'px');
    });

  // Drawing lakes on the globe
  svg.selectAll('path.lake')
    .data(lakes)
    .enter().append('path')
    .attr('class', 'lake')
    .attr('d', path);

  // Drag event
  svg.selectAll('path')
    .call(d3.behavior.drag()
      .origin(function() {
        var r = projection.rotate();
        return {x: r[0] / sens, y: -r[1] / sens};
      })
      .on('drag', function() {
        var rotate = projection.rotate();
        projection.rotate([d3.event.x * sens, -d3.event.y * sens, rotate[2]]);
        svg.selectAll('path.land').attr('d', path);
        svg.selectAll('path.lake').attr('d', path);
        svg.selectAll('.focused').classed('focused', focused = false);
      }))
    .call(d3.behavior.zoom()
      .scale(projection.scale())
      .scaleExtent([200, 1000])
      .on('zoom', function () {
        var scale = d3.event.scale;
        projection.scale(scale);
        sens = 0.25 - 0.2*((scale - 245)/(1000 - 245));
        svg.selectAll('path.land').attr('d', path);
        svg.selectAll('path.water').attr('d', path);
        svg.selectAll('path.lake').attr('d', path);
      }));

  // Country focus on option select
  d3.select('select').on('change', function() {
    var rotate = projection.rotate(),
      focusedCountry = country(countries, this),
      p = d3.geo.centroid(focusedCountry);

    svg.selectAll('.focused').classed('focused', focused = false);

    // Globe rotating
    (function transition() {
      d3.transition()
        .duration(2500)
        .tween('rotate', function() {
          var r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
          return function(t) {
            projection.rotate(r(t));
            svg.selectAll('path').attr('d', path)
              .classed('focused', function(d, i) {
                return d.id == focusedCountry.id ? focused = d : false;
              });
          };
        })
    })();
  });

  function country(cnt, sel) {
    for (var i = 0, l = cnt.length; i < l; i++) {
      if(cnt[i].id == sel.value) {
        return cnt[i];
      }
    }
  }

}