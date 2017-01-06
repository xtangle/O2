// Cash balance data
const cash_danger = -10000, cash_warn = -1000, cash_zero = 0, cash_ok = 100000, cash_excess = 1000000;
var cashBalances = {};
cashBalances['Canada'] = 80000;
cashBalances['India'] = -800;
cashBalances['Greece'] = -50000;
cashBalances['China'] = 0;
cashBalances['Finland'] = 700000;

// Globe parameters
const width = 600, height = 500;
const sens_0 = 0.25, sens_adjust = 0.2;
const scale_0 = 245, scale_min = 150, scale_max = 1000;

var sens = sens_0;
var focused = false;

// Setting projection
var projection = d3.geo.orthographic()
  .scale(scale_0)
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

  var countryNames = {};
  var countries = topojson.feature(world, world.objects.countries).features;
  var lakes = topojson.feature(world, world.objects.ne_110m_lakes).features;

  // Adding countries to select
  countryData.forEach(function(d) {
    countryNames[d.id] = d.name;
    option = countryList.append('option');
    option.text(d.name);
    option.property('value', d.id);
  });

  // Drawing countries on the globe
  countries.forEach(function(d) {
    var cashBalance = cashBalances[countryNames[d.id]];
    var color = cashBalanceToColor(cashBalance);
    svg.selectAll('path#country-' + d.id)
      .data([d])
      .enter().append('path')
      .attr('class', 'land')
      .attr('d', path)
      .style('fill', 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')');
  });

  // Land events
  svg.selectAll('path.land')
    // Mouse events
    .on('mouseover', function(d) {
      var cashBalance = cashBalances[countryNames[d.id]];
      countryTooltip.text(countryNames[d.id] + ((cashBalance !== undefined && cashBalance !== null) ?
          '\nAmount: ' + formatCurrencyString(cashBalance) : ''))
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

  // Globe events
  svg.selectAll('path')
    // Drag event
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
    // Zoom event
    .call(d3.behavior.zoom()
      .scale(projection.scale())
      .scaleExtent([scale_min, scale_max])
      .on('zoom', function () {
        var scale = d3.event.scale;
        projection.scale(scale);

        var scaleFactor = (scale - scale_0)/Math.max(scale_max - scale_0, scale_0 - scale_min);
        sens = sens_0 - sens_adjust * Math.sign(scaleFactor)*Math.sqrt(Math.abs(scaleFactor));

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

  function cashBalanceToColor(cashBalance) {
    var r, g, b, f;
    if (cashBalance === null || cashBalance === undefined) {
      r = g = b = 177;
    } else if (cashBalance < cash_danger) {
      r = 255;
      g = 0;
      b = 0;
    } else if (cashBalance < cash_warn) {
      f = Math.min(1, (cashBalance - cash_warn)/(cash_danger - cash_warn));
      r = 255;
      g = 127 - Math.floor(127 * f);
      b = 0;
    } else if (cashBalance < cash_zero) {
      f = Math.min(1, (cashBalance - cash_zero)/(cash_warn - cash_zero));
      r = 255;
      g = 255 - Math.floor(128 * f);
      b = 0;
    } else if (cashBalance < cash_ok) {
      f = Math.min(1, (cashBalance - cash_zero)/(cash_ok - cash_zero));
      r = 255 - Math.floor(255 * Math.sqrt(f));
      g = 255;
      b = 0;
    } else {
      f = Math.min(1, (cashBalance - cash_ok)/(cash_excess - cash_ok));
      r = 0;
      g = 255;
      b = Math.floor(255 * f);
    }
    return {r: r, g: g, b: b};
  }

  function formatCurrencyString(cashBalance) {
    if (cashBalance === undefined || cashBalance === null) {
      return '';
    } else if (cashBalance < 0) {
      return '-' + '$' + (-cashBalance);
    } else {
      return '$' + cashBalance;
    }
  }

}